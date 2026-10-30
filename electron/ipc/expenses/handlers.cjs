// electron/ipc/expenses/handlers.cjs
// ⭐ FIX: withDb → auto-forceReconnect
// ⭐ FIX: Re-cache statements rehefa vaovao ny db instance
'use strict';

const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { log, error } = require('./logger.cjs');
const { validateExpense } = require('./validation.cjs');
const { buildExpensesQuery, buildExpensesCountQuery } = require('./queries.cjs');
const {
  prepareStatements,
  getStmtGetById,
  getStmtGetByPeriod,
  getStmtGetByCategory,
  getStmtGetByMode,
  getStmtGetSummaryWithDates,
  getStmtGetSummary,
  getStmtGetTopCategoriesWithDates,
  getStmtGetTopCategories,
  getStmtGetStats,
  getStmtGetStatsWithDates,
  getStmtDeleteById,
  getStmtGetByIdForBulk,
  getStmtInsertExpense,
  getStmtUpdateExpense,
} = require('./statements.cjs');

let emitFinancialChanged = null;
try {
  const financialModule = require('../financial.cjs');
  if (financialModule && typeof financialModule.emitFinancialChanged === 'function') {
    emitFinancialChanged = financialModule.emitFinancialChanged;
  } else {
    emitFinancialChanged = () => {};
  }
} catch (_) {
  emitFinancialChanged = () => {};
}

// ⭐⭐⭐ WRAPPER: withDb — auto-reconnect + error handling ⭐⭐⭐
function withDb(fn) {
  return (event, ...args) => {
    try {
      let db = getDb();

      // ⭐ FIX: Raha tsy misokatra, manandrana forceReconnect
      if (!db || !db.open) {
        console.warn('⚠️ [expenses] DB closed! Trying forceReconnect...');
        try {
          db = forceReconnect();
        } catch (reconnectErr) {
          error('❌ [expenses] forceReconnect failed:', reconnectErr?.message);
        }
      }

      if (!db || !db.open) {
        error('❌ [expenses] Database connection is not open après forceReconnect');
        return { success: false, error: 'Database connection is not open' };
      }

      // ⭐ FIX: Re-prepare (idempotent — mamerina mamorona cache raha vaovao ny db)
      if (!prepareStatements()) {
        error('❌ [expenses] prepareStatements failed');
        return { success: false, error: 'Statements not available' };
      }

      return fn(db, event, ...args);
    } catch (err) {
      error('❌ [expenses] withDb:', err?.message || err);
      return { success: false, error: err?.message || 'Erreur interne expenses' };
    }
  };
}

function logAudit(action, expenseId, category, amount, userId, details = '') {
  try {
    const db = getDb();
    if (!db || !db.open) return;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at)
      VALUES (?, 'depense', ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(action, expenseId, category, userId, `${details} Montant: ${amount}`);
  } catch (_) { /* ignore */ }
}

function registerExpensesHandlers(ipcMain) {
  log('💸 [expenses.handlers] ENREGISTREMENT');
  if (!ipcMain) { error('❌ ipcMain null'); return false; }

  // ⭐ Prepare voalohany
  if (!prepareStatements()) {
    error('❌ [expenses.handlers] Statements non préparés');
    return false;
  }

  const channels = [
    'expenses:get-all',
    'expenses:get-by-id',
    'expenses:create',
    'expenses:update',
    'expenses:delete',
    'expenses:get-by-period',
    'expenses:get-by-category',
    'expenses:get-summary',
    'expenses:get-stats',
    'expenses:bulk-delete',
    'expenses:get-by-mode',
  ];
  for (const ch of channels) { try { ipcMain.removeHandler(ch); } catch (_) {} }

  // ═══════════════════════════════════════════════════════════
  // GET ALL
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:get-all', withDb((db, event, options = {}) => {
    const { query, params, limit, offset } = buildExpensesQuery(options);
    const data = db.prepare(query).all(params);

    const { query: countQuery, params: countParams } = buildExpensesCountQuery(options);
    const countResult = db.prepare(countQuery).get(countParams);

    return {
      success: true,
      data,
      pagination: {
        total: countResult?.total || 0,
        limit,
        offset,
        page: options.page || 1,
        totalPages: Math.ceil((countResult?.total || 0) / limit) || 1,
      },
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY ID
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:get-by-id', withDb((db, event, id) => {
    const expense = getStmtGetById(db).get(id);
    if (!expense) return { success: false, error: 'Dépense non trouvée' };
    return { success: true, data: expense };
  }));

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:create', withDb((db, event, data, userId = null) => {
    const validation = validateExpense(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };

    const expenseData = validation.data;
    const dateDepense = expenseData.date_depense || new Date().toISOString().split('T')[0];

    const cols = getStmtGetById(db).columns ? Object.keys(getStmtGetById(db).columns) : [];
    const fields = ['categorie', 'description', 'montant', 'date_depense'];
    const placeholders = ['?', '?', '?', '?'];
    const params = [expenseData.categorie, expenseData.description, expenseData.montant, dateDepense];

    if (cols.includes('mode_paiement')) { fields.push('mode_paiement'); placeholders.push('?'); params.push(expenseData.mode_paiement); }
    if (cols.includes('reference')) { fields.push('reference'); placeholders.push('?'); params.push(expenseData.reference); }
    if (cols.includes('observation')) { fields.push('observation'); placeholders.push('?'); params.push(expenseData.observation); }
    if (cols.includes('fournisseur_id')) { fields.push('fournisseur_id'); placeholders.push('?'); params.push(expenseData.fournisseur_id); }
    if (cols.includes('fournisseur_nom')) { fields.push('fournisseur_nom'); placeholders.push('?'); params.push(expenseData.fournisseur_nom); }

    fields.push('created_at');
    placeholders.push('CURRENT_TIMESTAMP');

    const insertStmt = getStmtInsertExpense(db, fields, placeholders);
    const result = insertStmt.run(...params);
    const expenseId = result.lastInsertRowid;

    if (userId) {
      logAudit('create', expenseId, expenseData.categorie, expenseData.montant, userId,
        `Description: ${expenseData.description?.substring(0, 50) || ''}`);
    }

    if (emitFinancialChanged) {
      emitFinancialChanged({ type: 'expense_created', id: expenseId, montant: expenseData.montant });
    }

    return { success: true, data: { id: Number(expenseId), ...expenseData, date_depense: dateDepense } };
  }));

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:update', withDb((db, event, id, data, userId = null) => {
    const expenseId = Number(id);
    if (!expenseId || expenseId <= 0) return { success: false, error: 'ID invalide' };

    const existing = getStmtGetById(db).get(expenseId);
    if (!existing) return { success: false, error: 'Dépense non trouvée' };

    const validation = validateExpense(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };

    const expenseData = validation.data;
    const dateDepense = expenseData.date_depense || new Date().toISOString().split('T')[0];

    const cols = getStmtGetById(db).columns ? Object.keys(getStmtGetById(db).columns) : [];
    const setFields = ['categorie = ?', 'description = ?', 'montant = ?', 'date_depense = ?'];
    const params = [expenseData.categorie, expenseData.description, expenseData.montant, dateDepense];

    if (cols.includes('mode_paiement')) { setFields.push('mode_paiement = ?'); params.push(expenseData.mode_paiement); }
    if (cols.includes('reference')) { setFields.push('reference = ?'); params.push(expenseData.reference); }
    if (cols.includes('observation')) { setFields.push('observation = ?'); params.push(expenseData.observation); }
    if (cols.includes('fournisseur_id')) { setFields.push('fournisseur_id = ?'); params.push(expenseData.fournisseur_id); }
    if (cols.includes('fournisseur_nom')) { setFields.push('fournisseur_nom = ?'); params.push(expenseData.fournisseur_nom); }

    setFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(expenseId);

    const updateStmt = getStmtUpdateExpense(db, setFields);
    updateStmt.run(...params);

    if (userId) {
      logAudit('update', expenseId, expenseData.categorie, expenseData.montant, userId,
        `Ancien: ${existing.categorie} - ${existing.montant} Ar`);
    }

    if (emitFinancialChanged) {
      emitFinancialChanged({ type: 'expense_updated', id: expenseId, montant: expenseData.montant });
    }

    return { success: true, data: { id: expenseId, ...expenseData, date_depense: dateDepense } };
  }));

  // ═══════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:delete', withDb((db, event, id, userId = null) => {
    const expenseId = Number(id);
    if (!expenseId || expenseId <= 0) return { success: false, error: 'ID invalide' };

    const existing = getStmtGetById(db).get(expenseId);
    if (!existing) return { success: false, error: 'Dépense non trouvée' };

    if (userId) {
      logAudit('delete', expenseId, existing.categorie, existing.montant, userId);
    }

    getStmtDeleteById(db).run(expenseId);

    if (emitFinancialChanged) {
      emitFinancialChanged({ type: 'expense_deleted', id: expenseId, montant: existing.montant });
    }

    return { success: true, data: { id: expenseId, categorie: existing.categorie, montant: existing.montant } };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY PERIOD
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:get-by-period', withDb((db, event, startDate, endDate) => {
    const data = getStmtGetByPeriod(db).all(startDate, endDate);
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY CATEGORY
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:get-by-category', withDb((db, event, categorie) => {
    const data = getStmtGetByCategory(db).all(categorie);
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY MODE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:get-by-mode', withDb((db, event, mode) => {
    const data = getStmtGetByMode(db).all(mode);
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET SUMMARY
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:get-summary', withDb((db, event, startDate, endDate) => {
    let summary, topCategories;

    if (startDate && endDate) {
      summary = getStmtGetSummaryWithDates(db).get(startDate, endDate);
      topCategories = getStmtGetTopCategoriesWithDates(db).all(startDate, endDate);
    } else {
      summary = getStmtGetSummary(db).get();
      topCategories = getStmtGetTopCategories(db).all();
    }

    return {
      success: true,
      data: {
        summary: {
          total: summary?.total_count || 0,
          totalAmount: summary?.total_amount || 0,
          average: summary?.average_amount || 0,
          max: summary?.max_amount || 0,
          min: summary?.min_amount || 0,
          categories: summary?.categories_count || 0,
        },
        topCategories: topCategories || [],
      },
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET STATS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:get-stats', withDb((db, event, options = {}) => {
    const { startDate, endDate } = options || {};
    const hasDateFilter = Boolean(startDate && endDate);

    let rawStats;
    if (hasDateFilter) {
      rawStats = getStmtGetStatsWithDates(db).get(startDate, endDate) || {};
    } else {
      rawStats = getStmtGetStats(db).get() || {};
    }

    let rawTopCategories;
    if (hasDateFilter) {
      rawTopCategories = getStmtGetTopCategoriesWithDates(db).all(startDate, endDate) || [];
    } else {
      rawTopCategories = getStmtGetTopCategories(db).all() || [];
    }

    const topCategories = rawTopCategories.slice(0, 3).map(row => ({
      categorie: row.categorie,
      count: Number(row.count || 0),
      total: Number(row.total || 0),
    }));

    const stats = {
      total: Number(rawStats.total || 0),
      nb: Number(rawStats.nb || 0),
      moyenne: Number(rawStats.moyenne || 0),
      plusGrande: Number(rawStats.plusGrande || 0),
      plusPetite: Number(rawStats.plusPetite || 0),
      nbFournisseurs: Number(rawStats.nbFournisseurs || 0),
      mois_en_cours: Number(rawStats.mois_en_cours || 0),
      mois_dernier: Number(rawStats.mois_dernier || 0),
      topCategories,
      total_montant: Number(rawStats.total || 0),
      total_nb: Number(rawStats.nb || 0),
      total_moyenne: Number(rawStats.moyenne || 0),
      nb_fournisseurs: Number(rawStats.nbFournisseurs || 0),
      top_categories: topCategories,
      startDate: startDate || null,
      endDate: endDate || null,
    };

    return { success: true, data: stats };
  }));

  // ═══════════════════════════════════════════════════════════
  // BULK DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('expenses:bulk-delete', withDb((db, event, ids, userId = null) => {
    if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "Liste d'IDs invalide" };

    const safeIds = ids.slice(0, 50);

    const transaction = db.transaction(() => {
      const getStmt = getStmtGetByIdForBulk(db);
      const deleteStmt = getStmtDeleteById(db);

      for (const id of safeIds) {
        const existing = getStmt.get(id);
        if (!existing) continue;
        if (userId) logAudit('bulk_delete', id, existing.categorie, existing.montant, userId);
        deleteStmt.run(id);
      }
    });
    transaction();

    if (emitFinancialChanged) {
      emitFinancialChanged({ type: 'expenses_bulk_deleted', count: safeIds.length });
    }

    return { success: true, deleted: safeIds.length };
  }));

  log('✅ [expenses.handlers] Enregistrés (withDb + auto-forceReconnect + re-prepare)');
  return true;
}

module.exports = { registerExpensesHandlers };