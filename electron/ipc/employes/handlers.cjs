// ============================================================
// electron/ipc/employes/handlers.cjs — Lifes-Art ERP
// ⭐ FIX: withDb → auto-forceReconnect + re-prepare statements
// ⭐ FIX: Nesorina ny `statementsRef` stale
// ============================================================
'use strict';

const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { BrowserWindow } = require('electron');
const { log, error } = require('./logger.cjs');
const { logAudit } = require('./audit.cjs');
const { VALID_STATUSES, STATUS_LABELS, normalizeStatus, validateEmploye } = require('./validation.cjs');
const { buildEmployesQuery, buildEmployesCountQuery } = require('./queries.cjs');
const statementsModule = require('./statements.cjs');

function emitEmployesChanged(data) {
  const windows = BrowserWindow.getAllWindows();
  if (!windows.length) return;
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      try { win.webContents.send('employes:changed', data); } catch (err) { error('❌ emitEmployesChanged:', err.message); }
    }
  });
}

const VALID_PRESENCE_STATUTS = ['present', 'absent', 'conge'];

// ⭐⭐⭐ WRAPPER: withDb — auto-reconnect + re-prepare ⭐⭐⭐
function withDb(fn) {
  return async (event, ...args) => {
    try {
      let db = getDb();

      // ⭐ FIX: Raha tsy misokatra, manandrana forceReconnect
      if (!db || !db.open) {
        console.warn('⚠️ [employes] DB closed! Trying forceReconnect...');
        try {
          db = forceReconnect();
        } catch (reconnectErr) {
          error('❌ [employes] forceReconnect failed:', reconnectErr?.message);
        }
      }

      if (!db || !db.open) {
        error('❌ [employes] Database connection is not open après forceReconnect');
        return { success: false, error: 'Database connection is not open' };
      }

      // ⭐ Re-prepare statements (idempotent amin'ny lastPreparedDb)
      if (!statementsModule.prepareStatements()) {
        error('❌ [employes] Impossible de préparer les statements');
        return { success: false, error: 'Statements not available' };
      }

      const stmts = statementsModule.getStatements();
      if (!stmts || !stmts.stmtGetById || !stmts.stmtCreate) {
        error('❌ [employes] Statements unavailable');
        return { success: false, error: 'Statements not available' };
      }

      return await fn(db, stmts, event, ...args);
    } catch (err) {
      error('❌ [employes] withDb:', err?.message || err);
      return { success: false, error: err?.message || 'Employés database error' };
    }
  };
}

function registerEmployesHandlers(ipcMain) {
  log('👷 [employes.handlers] ENREGISTREMENT');
  if (!ipcMain) { error('❌ ipcMain null'); return false; }

  const channels = [
    'employes:get-all', 'employes:get-by-id', 'employes:create', 'employes:update',
    'employes:delete', 'employes:get-by-departement', 'employes:get-by-status',
    'employes:get-stats', 'employes:search', 'employes:bulk-delete',
    'employes:update-status', 'employes:bulk-update-status',
    'employes:get-paiement-counts-batch', 'employes:get-total-salaires-payes',
    'employes:get-presence', 'employes:update-presence',
    'employes:get-salary-history', 'employes:update-salary',
    'employes:get-presence-journaliere', 'employes:update-presence-journaliere', 'employes:delete-presence-journaliere',
    'employes:get-presence-journaliere-mois', 'employes:bulk-update-presence-journaliere',
    'employes:get-presence-historique',
    'employes:get-planning', 'employes:update-planning', 'employes:delete-planning',
    'payments:get-last-batch'
  ];
  for (const ch of channels) { try { ipcMain.removeHandler(ch); } catch (_) {} }

  // ⭐ Prepare voalohany
  if (!statementsModule.prepareStatements()) {
    error('❌ [employes.handlers] prepareStatements() a échoué');
    return false;
  }

  // ════════════════════════════════════════════════════════════
  // ✅ GET ALL EMPLOYES
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-all', withDb((db, stmts, event, options = {}) => {
    const { query, params } = buildEmployesQuery(options);
    const data = db.prepare(query).all(params);
    const { query: countQuery, params: countParams } = buildEmployesCountQuery(options);
    const countResult = db.prepare(countQuery).get(countParams);
    const total = Number(countResult?.total || 0);
    return { success: true, data, total };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET BY ID
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-by-id', withDb((db, stmts, event, id) => {
    const data = stmts.stmtGetById.get(Number(id));
    if (!data) return { success: false, error: 'Employé non trouvé' };
    data.status_label = STATUS_LABELS[data.status] || data.status;
    return { success: true, data };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ CREATE
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:create', withDb((db, stmts, event, data, userId = null) => {
    const validation = validateEmploye(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };

    const { nom, prenom, email, telephone, poste, departement, date_embauche, salaire, cnaps, ostie, irsa, status } = validation.data;

    const existing = stmts.stmtCheckEmail.get(email);
    if (existing) return { success: false, error: 'Cet email est déjà utilisé' };

    const result = stmts.stmtCreate.run(nom, prenom, email, telephone, poste, departement, date_embauche, salaire, cnaps, ostie, irsa, status);
    const id = Number(result.lastInsertRowid);

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('create', id, `${prenom} ${nom}`, auditUser, `Poste: ${poste}`);

    emitEmployesChanged({ type: 'create', id });

    const newEmploye = stmts.stmtGetById.get(id);
    return { success: true, data: newEmploye };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ UPDATE
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:update', withDb((db, stmts, event, id, data, userId = null) => {
    const validation = validateEmploye(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };

    const { nom, prenom, email, telephone, poste, departement, date_embauche, salaire, cnaps, ostie, irsa, status } = validation.data;

    const existing = stmts.stmtCheckEmailExcept.get(email, id);
    if (existing) return { success: false, error: 'Cet email est déjà utilisé' };

    stmts.stmtUpdate.run(nom, prenom, email, telephone, poste, departement, date_embauche, salaire, cnaps, ostie, irsa, status, id);

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('update', id, `${prenom} ${nom}`, auditUser, 'Mise à jour');

    emitEmployesChanged({ type: 'update', id });

    const updated = stmts.stmtGetById.get(id);
    return { success: true, data: updated };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ DELETE (soft)
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:delete', withDb((db, stmts, event, id, userId = null) => {
    const existing = stmts.stmtGetById.get(Number(id));
    if (!existing) return { success: false, error: 'Employé non trouvé' };

    const count = stmts.stmtPaymentCount.get(id);
    stmts.stmtSoftDelete.run('licencie', id);

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('delete', id, `${existing.prenom} ${existing.nom}`, auditUser, count?.total > 0 ? `${count.total} paiements associés` : 'Soft delete');

    emitEmployesChanged({ type: 'delete', id });
    return {
      success: true,
      data: {
        id,
        status: 'licencie',
        message: count?.total > 0 ? `${count.total} paiements associés` : 'Marqué licencié'
      }
    };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ BULK DELETE
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:bulk-delete', withDb((db, stmts, event, ids, userId = null) => {
    const safeIds = ids.slice(0, 50);
    const transaction = db.transaction(() => {
      const stmt = db.prepare('UPDATE employes SET status = ? WHERE id = ?');
      for (const id of safeIds) {
        const existing = stmts.stmtGetById.get(id);
        if (existing) {
          stmt.run('licencie', id);
          const auditUser = userId || event?.sender?.user?.id || null;
          if (auditUser) logAudit('bulk_delete', id, `${existing.prenom} ${existing.nom}`, auditUser, 'Suppression groupée');
        }
      }
    });
    transaction();
    emitEmployesChanged({ type: 'bulk_delete', ids: safeIds });
    return { success: true, deleted: safeIds.length };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET BY DEPARTEMENT
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-by-departement', withDb((db, stmts, event, departement) => {
    const data = stmts.stmtGetByDepartement.all(departement, 'actif');
    return { success: true, data };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET BY STATUS
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-by-status', withDb((db, stmts, event, status) => {
    const normalized = normalizeStatus(status);
    if (!VALID_STATUSES.includes(normalized)) return { success: false, error: 'Status invalide' };
    const data = stmts.stmtGetByStatus.all(normalized);
    return { success: true, data };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET STATS
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-stats', withDb((db, stmts) => {
    if (!stmts.stmtStats) return { success: false, error: 'Statements non initialisés' };
    const stats = stmts.stmtStats.get();
    return {
      success: true,
      data: {
        total: Number(stats?.total || 0),
        actifs: Number(stats?.actifs || 0),
        en_conge: Number(stats?.en_conge || 0),
        inactifs: Number(stats?.inactifs || 0),
        licencies: Number(stats?.licencies || 0),
        total_salaires: Number(stats?.total_salaires || 0),
        salaire_moyen: Number(stats?.salaire_moyen || 0),
        departements: Number(stats?.departements || 0)
      }
    };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ SEARCH
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:search', withDb((db, stmts, event, searchTerm) => {
    const s = `%${String(searchTerm).trim()}%`;
    const data = stmts.stmtSearch.all(s, s, s);
    return { success: true, data };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ UPDATE STATUS
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:update-status', withDb((db, stmts, event, id, status, userId = null) => {
    const normalized = normalizeStatus(status);
    if (!VALID_STATUSES.includes(normalized)) return { success: false, error: 'Status invalide' };

    const existing = stmts.stmtGetById.get(id);
    if (!existing) return { success: false, error: 'Employé non trouvé' };

    stmts.stmtUpdateStatus.run(normalized, id);

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('status_change', id, `${existing.prenom} ${existing.nom}`, auditUser, `Nouveau statut: ${normalized}`);

    emitEmployesChanged({ type: 'update_status', id, status: normalized });
    return { success: true, data: { id, status: normalized } };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ BULK UPDATE STATUS
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:bulk-update-status', withDb((db, stmts, event, ids, newStatus, userId = null) => {
    const safeIds = ids.slice(0, 50);
    const normalized = normalizeStatus(newStatus);
    if (!VALID_STATUSES.includes(normalized)) return { success: false, error: 'Status invalide' };

    const placeholders = safeIds.map(() => '?').join(',');
    const stmt = db.prepare(`UPDATE employes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`);
    const result = stmt.run(normalized, ...safeIds);

    const auditUser = userId || event?.sender?.user?.id || null;
    safeIds.forEach(id => {
      const emp = stmts.stmtGetById.get(id);
      if (emp && auditUser) logAudit('bulk_update_status', id, `${emp.prenom} ${emp.nom}`, auditUser, `Nouveau statut: ${normalized}`);
    });

    emitEmployesChanged({ type: 'bulk_update_status', ids: safeIds, status: normalized });
    return { success: true, changes: result.changes };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET PAIEMENT COUNTS BATCH
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-paiement-counts-batch', withDb((db, stmts, event, ids) => {
    const safeIds = ids.slice(0, 50);
    if (!safeIds.length) return { success: true, data: [] };

    const placeholders = safeIds.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT employe_id, COUNT(*) AS count FROM paiements_employes WHERE employe_id IN (${placeholders}) GROUP BY employe_id`);
    const rows = stmt.all(...safeIds);
    return { success: true, data: rows };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET TOTAL SALAIRES PAYES
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-total-salaires-payes', withDb((db, stmts, event, annee) => {
    let query = `SELECT COALESCE(SUM(montant), 0) as total FROM paiements_employes`;
    const params = [];
    if (annee) {
      query += ` WHERE strftime('%Y', date_paiement) = ?`;
      params.push(String(annee));
    }
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return { success: true, data: result?.total || 0 };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET PRESENCE (agrégée mensuelle)
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-presence', withDb((db, stmts, event, employeId, mois, annee) => {
    const stmt = db.prepare('SELECT * FROM presence_employes WHERE employe_id = ? AND mois = ? AND annee = ?');
    const presence = stmt.get(employeId, mois, annee);
    return {
      success: true,
      data: presence || { jours_absences: 0, jours_conges: 0, jours_maladie: 0, justificatif_maladie: '', observation: '' }
    };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ UPDATE PRESENCE (agrégée mensuelle)
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:update-presence', withDb((db, stmts, event, data) => {
    const { employe_id, mois, annee, jours_absences, jours_conges, jours_maladie, justificatif_maladie, observation } = data;
    const stmt = db.prepare(`
      INSERT INTO presence_employes (employe_id, mois, annee, jours_absences, jours_conges, jours_maladie, justificatif_maladie, observation, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(employe_id, mois, annee) DO UPDATE SET
        jours_absences = excluded.jours_absences,
        jours_conges = excluded.jours_conges,
        jours_maladie = excluded.jours_maladie,
        justificatif_maladie = excluded.justificatif_maladie,
        observation = excluded.observation,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(employe_id, mois, annee, jours_absences || 0, jours_conges || 0, jours_maladie || 0, justificatif_maladie || '', observation || '');
    return { success: true };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ GET SALARY HISTORY
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:get-salary-history', withDb((db, stmts, event, employeId) => {
    const stmt = db.prepare('SELECT * FROM historique_salaires WHERE employe_id = ? ORDER BY date_changement DESC');
    const history = stmt.all(employeId);
    return { success: true, data: history };
  }));

  // ════════════════════════════════════════════════════════════
  // ✅ UPDATE SALARY
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('employes:update-salary', withDb((db, stmts, event, employeId, newSalary, raison) => {
    const current = db.prepare('SELECT salaire FROM employes WHERE id = ?').get(employeId);
    if (!current) return { success: false, error: 'Employé non trouvé' };

    const oldSalary = Number(current.salaire || 0);
    const newSal = Number(newSalary || 0);

    db.prepare('UPDATE employes SET salaire = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newSal, employeId);
    db.prepare('INSERT INTO historique_salaires (employe_id, ancien_salaire, nouveau_salaire, raison) VALUES (?, ?, ?, ?)')
      .run(employeId, oldSalary, newSal, raison || 'Fisondrotana karama');

    return { success: true };
  }));

  // ============================================================
  // ⭐ PRESENCE JOURNALIERE HANDLERS (RH PRO)
  // ============================================================
  ipcMain.handle('employes:get-presence-journaliere', withDb((db, stmts, event, employeId, date) => {
    if (!employeId || !date) {
      return { success: false, error: 'Paramètres invalides (employeId, date requis)', data: null };
    }
    const data = stmts.stmtGetPresenceJournaliereByEmployeDate?.get(Number(employeId), String(date));
    return { success: true, data: data || null };
  }));

  ipcMain.handle('employes:update-presence-journaliere', withDb((db, stmts, event, data) => {
    const {
      employe_id, date, statut,
      heure_arrivee, heure_depart,
      heure_debut_planifiee, heure_fin_planifiee,
      retard, heures_travaillees, heures_sup,
      observation
    } = data;

    if (!employe_id || !date || !statut) {
      return { success: false, error: 'Champs obligatoires manquants' };
    }

    if (!VALID_PRESENCE_STATUTS.includes(statut)) {
      return { success: false, error: 'Statut invalide (present, absent, conge)' };
    }

    const isPresent = statut === 'present';

    stmts.stmtUpsertPresenceJournaliere.run(
      Number(employe_id),
      String(date),
      statut,
      isPresent ? (heure_arrivee || null) : null,
      isPresent ? (heure_depart || null) : null,
      isPresent ? (heure_debut_planifiee || '08:00') : null,
      isPresent ? (heure_fin_planifiee || '17:00') : null,
      isPresent ? Math.max(0, Number(retard) || 0) : 0,
      isPresent ? Math.max(0, Number(heures_travaillees) || 0) : 0,
      isPresent ? Math.max(0, Number(heures_sup) || 0) : 0,
      observation || ''
    );

    emitEmployesChanged({ type: 'presence_journaliere', employe_id, date, statut });
    return { success: true };
  }));

  ipcMain.handle('employes:delete-presence-journaliere', withDb((db, stmts, event, id) => {
    stmts.stmtDeletePresenceJournaliere.run(id);
    return { success: true };
  }));

  ipcMain.handle('employes:get-presence-journaliere-mois', withDb((db, stmts, event, mois, annee) => {
    const moisStr = `${annee}-${String(mois).padStart(2, '0')}`;
    const data = stmts.stmtGetPresenceJournaliereByMois.all(moisStr);
    return { success: true, data };
  }));

  ipcMain.handle('employes:bulk-update-presence-journaliere', withDb((db, stmts, event, payload) => {
    const { employe_ids, date, statut } = payload;

    if (!Array.isArray(employe_ids) || !date || !statut) {
      return { success: false, error: 'Payload invalide' };
    }

    if (!VALID_PRESENCE_STATUTS.includes(statut)) {
      return { success: false, error: 'Statut invalide (present, absent, conge)' };
    }

    const transaction = db.transaction(() => {
      for (const id of employe_ids) {
        stmts.stmtBulkUpsertPresenceJournaliere.run(
          Number(id),
          String(date),
          statut
        );
      }
    });
    transaction();

    emitEmployesChanged({
      type: 'bulk_presence_journaliere',
      date,
      statut,
      count: employe_ids.length
    });
    return { success: true, count: employe_ids.length };
  }));

  ipcMain.handle('employes:get-presence-historique', withDb((db, stmts, event, options = {}) => {
    let query = `
      SELECT pj.date, pj.statut,
             pj.heure_arrivee, pj.heure_depart,
             pj.heure_debut_planifiee, pj.heure_fin_planifiee,
             pj.retard, pj.heures_travaillees, pj.heures_sup,
             pj.observation,
             e.id as employe_id, e.nom, e.prenom, e.poste
      FROM presence_journaliere pj
      JOIN employes e ON pj.employe_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (options.employe_id) { query += ' AND pj.employe_id = ?'; params.push(Number(options.employe_id)); }
    if (options.type === 'jour' && options.date) { query += ' AND pj.date = ?'; params.push(options.date); }
    else if (options.type === 'mois' && options.mois && options.annee) {
      const startDate = `${options.annee}-${String(options.mois).padStart(2, '0')}-01`;
      const endDate = `${options.annee}-${String(options.mois).padStart(2, '0')}-31`;
      query += ' AND pj.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (options.type === 'annee' && options.annee) {
      query += ' AND pj.date LIKE ?';
      params.push(`${options.annee}-%`);
    }
    if (options.statut && options.statut !== 'Tous') {
      query += ' AND pj.statut = ?';
      params.push(options.statut);
    }
    query += ' ORDER BY pj.date DESC, e.nom ASC';
    const data = db.prepare(query).all(...params);
    return { success: true, data };
  }));

  // ============================================================
  // ⭐ PLANNING
  // ============================================================
  ipcMain.handle('employes:get-planning', withDb((db, stmts, event, employeId) => {
    const data = stmts.stmtGetPlanningByEmploye.all(employeId);
    return { success: true, data };
  }));

  ipcMain.handle('employes:update-planning', withDb((db, stmts, event, employeId, planningData) => {
    if (!Array.isArray(planningData)) return { success: false, error: 'Données planning invalides' };

    const transaction = db.transaction(() => {
      for (const item of planningData) {
        stmts.stmtUpsertPlanning.run(
          employeId,
          Number(item.jour_semaine),
          item.heure_debut || '08:00',
          item.heure_fin || '17:00',
          Number(item.pause || 1)
        );
      }
    });
    transaction();
    emitEmployesChanged({ type: 'planning_updated', employe_id: employeId });
    return { success: true };
  }));

  ipcMain.handle('employes:delete-planning', withDb((db, stmts, event, id) => {
    stmts.stmtDeletePlanning.run(id);
    return { success: true };
  }));

  log('✅ [employes.handlers] Enregistrés (withDb + auto-forceReconnect + re-prepare)');
  return true;
}

module.exports = { registerEmployesHandlers, emitEmployesChanged };