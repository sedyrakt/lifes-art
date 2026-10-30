// ============================================================
// electron/ipc/fournisseurs/handlers.cjs
// ⭐ FIX: withDb → auto-forceReconnect raha tsy misokatra ny DB
// ⭐ FIX: Re-prepare statements rehefa vaovao ny db instance
// ⭐ FIX: Tsy mampiasa `statementsRef` stale intsony
// ============================================================
'use strict';

const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { BrowserWindow } = require('electron');
const { log, error } = require('./logger.cjs');
const { logAudit } = require('./audit.cjs');
const { validateFournisseur } = require('./validation.cjs');
const { buildFournisseursQuery, buildFournisseursCountQuery, MAX_LIMIT } = require('./queries.cjs');
const statementsModule = require('./statements.cjs');

// ⭐⭐⭐ WRAPPER: withDb — auto-reconnect + re-prepare ⭐⭐⭐
function withDb(fn) {
  return (event, ...args) => {
    try {
      let db = getDb();

      // ⭐ FIX LEHIBE: Raha tsy misokatra, manandrana forceReconnect
      if (!db || !db.open) {
        try {
          db = forceReconnect();
        } catch (reconnectErr) {
          error('❌ [fournisseurs] forceReconnect failed:', reconnectErr?.message);
        }
      }

      if (!db || !db.open) {
        error('❌ [fournisseurs] Database connection is not open après forceReconnect');
        return { success: false, error: 'Database connection is not open' };
      }

      // ⭐ Re-prepare statements (idempotent — mamerina mamorona raha vaovao ny db)
      if (!statementsModule.prepareStatements()) {
        error('❌ [fournisseurs] Impossible de préparer les statements');
        return { success: false, error: 'Statements not available' };
      }

      return fn(db, statementsModule, event, ...args);
    } catch (err) {
      error('❌ [fournisseurs] withDb:', err?.message || err);
      return { success: false, error: err?.message || 'Erreur interne fournisseurs' };
    }
  };
}

function emitFournisseursChanged(data) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) return;
  windows.forEach((win) => {
    if (!win.isDestroyed()) {
      try { win.webContents.send('fournisseurs:changed', data); }
      catch (err) { error('❌ Erreur émission:', err.message); }
    }
  });
}

function registerFournisseursHandlers(ipcMain) {
  if (!ipcMain) { error('❌ ipcMain null/undefined!'); return false; }

  // ⭐ Prepare voalohany (raha tsy afaka, dia tsy manoratra handlers)
  if (!statementsModule.prepareStatements()) {
    error('❌ [fournisseurs.handlers] Statements non préparés au démarrage');
    return false;
  }

  const channels = [
    'fournisseurs:get-all', 'fournisseurs:get-by-id', 'fournisseurs:create',
    'fournisseurs:update', 'fournisseurs:delete', 'fournisseurs:get-products',
    'fournisseurs:search', 'fournisseurs:get-stats', 'fournisseurs:bulk-delete',
    'fournisseurs:get-by-email'
  ];
  for (const channel of channels) {
    try { ipcMain.removeHandler(channel); } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET ALL
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:get-all', withDb((db, stmts, event, options = {}) => {
    const { query, params } = buildFournisseursQuery(options);
    const data = db.prepare(query).all(params);

    const { query: countQuery, params: countParams } = buildFournisseursCountQuery(options);
    const countResult = db.prepare(countQuery).get(countParams);
    const total = Number(countResult?.total || 0);

    const limit = options.limit ? Math.min(Number(options.limit), MAX_LIMIT) : 8;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data,
      pagination: { total, limit, totalPages, page: options.page || 1 }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET BY ID
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:get-by-id', withDb((db, stmts, event, id) => {
    if (!stmts.stmtGetById) return { success: false, error: 'Service de base de données non disponible' };
    if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID invalide' };

    const data = stmts.stmtGetById.get(parseInt(id));
    if (!data) return { success: false, error: 'Fournisseur non trouvé' };

    const productCount = stmts.stmtProductCount.get(parseInt(id));
    data.product_count = productCount?.total || 0;

    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ CREATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:create', withDb((db, stmts, event, data, userId = null) => {
    if (!stmts.stmtCreate) return { success: false, error: 'Service de base de données non disponible' };

    const validation = validateFournisseur(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };
    const fd = validation.data;

    if (stmts.stmtGetByName.get(fd.nom)) return { success: false, error: 'Ce fournisseur existe déjà' };
    if (fd.email && stmts.stmtGetByEmail.get(fd.email)) return { success: false, error: 'Email déjà utilisé' };

    const result = stmts.stmtCreate.run(fd.nom, fd.contact, fd.telephone, fd.email, fd.adresse);
    const id = result.lastInsertRowid;

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('create', id, fd.nom, auditUser);

    emitFournisseursChanged({ type: 'create', id, nom: fd.nom });
    return { success: true, data: stmts.stmtGetById.get(id) };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ UPDATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:update', withDb((db, stmts, event, id, data, userId = null) => {
    if (!stmts.stmtUpdate) return { success: false, error: 'Service de base de données non disponible' };
    if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID invalide' };

    const fid = parseInt(id);
    const existing = stmts.stmtGetById.get(fid);
    if (!existing) return { success: false, error: 'Fournisseur non trouvé' };

    const validation = validateFournisseur(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };
    const fd = validation.data;

    if (stmts.stmtGetByNameExcept.get(fd.nom, fid)) return { success: false, error: 'Nom déjà utilisé' };
    if (fd.email && stmts.stmtGetByEmailExcept.get(fd.email, fid)) return { success: false, error: 'Email déjà utilisé' };

    stmts.stmtUpdate.run(fd.nom, fd.contact, fd.telephone, fd.email, fd.adresse, fid);

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('update', fid, fd.nom, auditUser);

    emitFournisseursChanged({ type: 'update', id: fid, nom: fd.nom });
    return { success: true, data: stmts.stmtGetById.get(fid) };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:delete', withDb((db, stmts, event, id, userId = null) => {
    if (!stmts.stmtDelete) return { success: false, error: 'Service de base de données non disponible' };
    if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID invalide' };

    const fid = parseInt(id);
    const existing = stmts.stmtGetById.get(fid);
    if (!existing) return { success: false, error: 'Fournisseur non trouvé' };

    if ((stmts.stmtProductCount.get(fid)?.total || 0) > 0) {
      return {
        success: false,
        error: `Impossible de supprimer "${existing.nom}". ${stmts.stmtProductCount.get(fid)?.total} produit(s) utilisent ce fournisseur.`
      };
    }
    if ((stmts.stmtExpenseCount.get(fid)?.total || 0) > 0) {
      return {
        success: false,
        error: `Impossible de supprimer "${existing.nom}". ${stmts.stmtExpenseCount.get(fid)?.total} dépense(s) utilisent ce fournisseur.`
      };
    }

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('delete', fid, existing.nom, auditUser);

    stmts.stmtDelete.run(fid);

    emitFournisseursChanged({ type: 'delete', id: fid, nom: existing.nom });
    return { success: true, data: { id: fid, nom: existing.nom } };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET PRODUCTS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:get-products', withDb((db, stmts, event, id) => {
    if (!stmts.stmtGetProductsByFournisseur) return { success: false, error: 'Service de base de données non disponible' };
    if (!id || isNaN(id)) return { success: false, error: 'ID invalide' };

    const products = stmts.stmtGetProductsByFournisseur.all(parseInt(id));
    return { success: true, data: products };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ SEARCH
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:search', withDb((db, stmts, event, searchTerm) => {
    if (!stmts.stmtSearch) return { success: false, error: 'Service de base de données non disponible' };
    if (!searchTerm || searchTerm.length < 2) {
      return { success: false, error: 'Le terme de recherche doit contenir au moins 2 caractères' };
    }

    const pattern = `%${searchTerm.trim()}%`;
    const data = stmts.stmtSearch.all(pattern, pattern, pattern, pattern);
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐⭐⭐ GET STATS ⭐⭐⭐
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:get-stats', withDb((db, stmts) => {
    if (!stmts.stmtGetStats) {
      return { success: false, error: 'Service de base de données non disponible' };
    }
    const raw = stmts.stmtGetStats.get() || {};

    const data = {
      total: Number(raw.total) || 0,
      avecContact: Number(raw.avec_contact) || 0,
      avecTelephone: Number(raw.avec_telephone) || 0,
      avecEmail: Number(raw.avec_email) || 0,
      avecAdresse: Number(raw.avec_adresse) || 0,
      avec_contact: Number(raw.avec_contact) || 0,
      avec_telephone: Number(raw.avec_telephone) || 0,
      avec_email: Number(raw.avec_email) || 0,
      avec_adresse: Number(raw.avec_adresse) || 0,
    };
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ BULK DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:bulk-delete', withDb((db, stmts, event, ids, userId = null) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: "Liste d'IDs invalide" };
    }

    const deleted = [], errors = [];

    const transaction = db.transaction(() => {
      for (const id of ids) {
        const existing = stmts.stmtGetById.get(id);
        if (!existing) {
          errors.push({ id, error: 'Fournisseur non trouvé' });
          continue;
        }
        if ((stmts.stmtProductCount.get(id)?.total || 0) > 0) {
          errors.push({
            id, nom: existing.nom,
            error: `${stmts.stmtProductCount.get(id)?.total} produit(s)`
          });
          continue;
        }
        if ((stmts.stmtExpenseCount.get(id)?.total || 0) > 0) {
          errors.push({
            id, nom: existing.nom,
            error: `${stmts.stmtExpenseCount.get(id)?.total} dépense(s)`
          });
          continue;
        }

        const auditUser = userId || event?.sender?.user?.id || null;
        if (auditUser) logAudit('bulk_delete', id, existing.nom, auditUser);

        stmts.stmtDelete.run(id);
        deleted.push({ id, nom: existing.nom });
      }
    });
    transaction();

    if (deleted.length > 0) {
      emitFournisseursChanged({ type: 'bulk_delete', count: deleted.length });
    }

    return {
      success: true,
      data: {
        deleted, errors,
        total: ids.length,
        deletedCount: deleted.length,
        errorCount: errors.length
      }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET BY EMAIL
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('fournisseurs:get-by-email', withDb((db, stmts, event, email) => {
    if (!stmts.stmtGetByEmail) return { success: false, error: 'Service de base de données non disponible' };
    if (!email?.trim()) return { success: false, error: 'Email requis' };

    return {
      success: true,
      data: stmts.stmtGetByEmail.get(email.trim().toLowerCase()) || null
    };
  }));

  log('✅ [fournisseurs.handlers] Enregistrés (withDb + auto-forceReconnect)');
  return true;
}

module.exports = { registerFournisseursHandlers };