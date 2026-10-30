// electron/ipc/stock/handlers.cjs
// ⭐ FIX: withDb → auto-forceReconnect raha tsy misokatra ny DB
// ⭐ NOUVEAU: Snapshot auto-update rehefa misy mouvement
'use strict';

const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { buildEntreesQuery, buildSortiesQuery, buildMouvementsQuery } = require('./queries.cjs');
const { validateQuantity, validateLimit, validateId, normalizeSearch } = require('./validation.cjs');
const { emitMouvementAdded } = require('./events.cjs');
const { prepareStatements } = require('./statements.cjs');
const { saveTodaySnapshot } = require('../../database/stockSnapshots.cjs');

function log(...args) { console.log('[📦 stock]', ...args); }
function error(...args) { console.error('[❌ stock]', ...args); }

// ⭐⭐⭐ WRAPPER: withDb — auto-reconnect + error handling ⭐⭐⭐
function withDb(fn) {
  return (event, ...args) => {
    try {
      let db = getDb();

      // ⭐ FIX: Raha tsy misokatra, manandrana forceReconnect
      if (!db || !db.open) {
        console.warn('⚠️ [stock] DB closed! Trying forceReconnect...');
        try {
          db = forceReconnect();
        } catch (reconnectErr) {
          error('❌ [stock] forceReconnect failed:', reconnectErr?.message);
        }
      }

      if (!db || !db.open) {
        error('❌ [stock] Database connection is not open après forceReconnect');
        return { success: false, error: 'Database connection is not open' };
      }

      // ⭐ Prepare statements (mamerina vaovao foana amin'ny stock)
      const stmts = prepareStatements();
      if (!stmts) {
        error('❌ [stock] Failed to prepare statements');
        return { success: false, error: 'Failed to prepare statements' };
      }

      return fn(db, stmts, event, ...args);
    } catch (err) {
      error('❌ [stock] withDb:', err?.message || err);
      return { success: false, error: err?.message || 'Erreur interne stock' };
    }
  };
}

// ⭐⭐⭐ SNAPSHOT TRIGGER ⭐⭐⭐
function triggerSnapshotUpdate(reason = 'mouvement') {
  try {
    setImmediate(() => {
      try {
        const ok = saveTodaySnapshot();
        if (ok) log(`📸 Snapshot mis à jour (${reason})`);
      } catch (err) {
        error(`❌ Snapshot update [${reason}]:`, err?.message || err);
      }
    });
  } catch (err) {
    error('❌ triggerSnapshotUpdate:', err?.message || err);
  }
}

function registerStockHandlers(ipcMain) {
  if (!ipcMain) { error('ipcMain est null ou undefined'); return false; }

  const channels = [
    'stock:get-entrees', 'stock:get-sorties', 'stock:get-mouvements',
    'stock:create-entree', 'stock:create-sortie', 'stock:get-stats',
    'stock:get-entrees-stats', 'stock:get-sorties-stats',
    'stock:bulk-delete-mouvements', 'stock:bulk-delete-entrees', 'stock:bulk-delete-sorties'
  ];

  for (const channel of channels) { try { ipcMain.removeHandler(channel); } catch (_) {} }

  // ============================================================
  // GET MOVEMENTS
  // ============================================================
  ipcMain.handle('stock:get-mouvements', withDb((db, stmts, event, options = {}) => {
    const limit = validateLimit(options.limit, 8, 500);
    const search = normalizeSearch(options.search);
    const sortBy = options.sortBy || 'date_mouvement';
    const sortOrder = String(options.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const validTypes = ['ENTREE', 'SORTIE', 'AJUSTEMENT'];
    const type = options.type && validTypes.includes(options.type) ? options.type : null;

    const result = buildMouvementsQuery({
      produitId: validateId(options.produitId),
      type: type,
      startDate: options.startDate || null,
      endDate: options.endDate || null,
      search,
      limit,
      lastId: options.lastId,
      sortBy,
      sortOrder
    });

    const data = db.prepare(result.dataQuery).all(...result.dataParams);
    const stats = db.prepare(result.statsQuery).get(...result.statsParams);
    const nextCursor = data.length === result.limit ? Number(data[data.length - 1].id) : null;

    return {
      success: true,
      data,
      stats: {
        total: Number(stats?.total || 0),
        entrees: Number(stats?.entrees || 0),
        sorties: Number(stats?.sorties || 0),
        ajustements: Number(stats?.ajustements || 0),
        quantiteEntree: Number(stats?.quantiteEntree || 0),
        quantiteSortie: Number(stats?.quantiteSortie || 0)
      },
      pagination: {
        limit: result.limit,
        count: data.length,
        hasMore: data.length === result.limit,
        nextCursor,
        total: Number(stats?.total || 0)
      }
    };
  }));

  // ============================================================
  // GET ENTREES
  // ============================================================
  ipcMain.handle('stock:get-entrees', withDb((db, stmts, event, options = {}) => {
    const limit = validateLimit(options.limit, 8, 500);
    const search = normalizeSearch(options.search);

    const result = buildEntreesQuery({
      produitId: validateId(options.produitId),
      fournisseurId: validateId(options.fournisseurId),
      startDate: options.startDate || null,
      endDate: options.endDate || null,
      search,
      limit,
      lastId: options.lastId,
      sortBy: options.sortBy || 'date_entree',
      sortOrder: options.sortOrder || 'DESC'
    });

    const data = db.prepare(result.dataQuery).all(...result.dataParams);
    const stats = db.prepare(result.statsQuery).get(...result.statsParams);

    return {
      success: true,
      data,
      stats,
      pagination: {
        limit: result.limit,
        count: data.length,
        hasMore: data.length === result.limit,
        nextCursor: data.length === result.limit ? data[data.length - 1].id : null,
        total: Number(stats?.total || 0)
      }
    };
  }));

  // ============================================================
  // GET SORTIES
  // ============================================================
  ipcMain.handle('stock:get-sorties', withDb((db, stmts, event, options = {}) => {
    const limit = validateLimit(options.limit, 8, 500);
    const search = normalizeSearch(options.search);

    const result = buildSortiesQuery({
      produitId: validateId(options.produitId),
      startDate: options.startDate || null,
      endDate: options.endDate || null,
      search,
      limit,
      lastId: options.lastId,
      sortBy: options.sortBy || 'date_sortie',
      sortOrder: options.sortOrder || 'DESC'
    });

    const data = db.prepare(result.dataQuery).all(...result.dataParams);
    const stats = db.prepare(result.statsQuery).get(...result.statsParams);

    return {
      success: true,
      data,
      stats,
      pagination: {
        limit: result.limit,
        count: data.length,
        hasMore: data.length === result.limit,
        nextCursor: data.length === result.limit ? data[data.length - 1].id : null,
        total: Number(stats?.total || 0)
      }
    };
  }));

  // ============================================================
  // CREATE ENTREE
  // ============================================================
  ipcMain.handle('stock:create-entree', withDb((db, stmts, event, data = {}, userId = null) => {
    const produitId = validateId(data.produit_id);
    if (!produitId) return { success: false, error: 'Produit non sélectionné' };

    const quantity = validateQuantity(data.quantite);
    if (!quantity.valid) return { success: false, error: quantity.error };
    const qty = quantity.value;

    const prixUnitaire = Number(data.prix_unitaire || 0);
    const reference = String(data.reference || '').slice(0, 200);
    const observation = String(data.observation || '').slice(0, 1000);
    const fournisseurId = validateId(data.fournisseur_id);

    const transaction = db.transaction(() => {
      const produit = stmts.stmtGetProduitById.get(produitId);
      if (!produit) throw new Error('Produit non trouvé');

      const ancienStock = Number(produit.quantite_stock || 0);
      const nouveauStock = ancienStock + qty;

      stmts.stmtInsertEntree.run(produitId, qty, Number.isFinite(prixUnitaire) ? prixUnitaire : 0, reference, fournisseurId, observation);
      stmts.stmtUpdateStockSeul.run(nouveauStock, produitId);

      const mouvement = stmts.stmtInsertMouvement.run(
        produitId, 'ENTREE', qty, ancienStock, nouveauStock, reference,
        `Entrée de stock - ${observation}`,
        Number.isFinite(prixUnitaire) ? prixUnitaire : 0,
        validateId(userId)
      );

      return {
        mouvementId: Number(mouvement.lastInsertRowid),
        produitId, qty, ancienStock, nouveauStock, reference
      };
    });

    const result = transaction();

    emitMouvementAdded({
      id: result.mouvementId,
      produit_id: result.produitId,
      type_mouvement: 'ENTREE',
      quantite: result.qty,
      ancien_stock: result.ancienStock,
      nouveau_stock: result.nouveauStock,
      reference: result.reference,
      prix_unitaire: Number.isFinite(prixUnitaire) ? prixUnitaire : 0,
      date_mouvement: new Date().toISOString()
    });

    triggerSnapshotUpdate('create-entree');

    return { success: true, data: result };
  }));

  // ============================================================
  // CREATE SORTIE
  // ============================================================
  ipcMain.handle('stock:create-sortie', withDb((db, stmts, event, data = {}, userId = null) => {
    const produitId = validateId(data.produit_id);
    if (!produitId) return { success: false, error: 'Produit non sélectionné' };

    const quantity = validateQuantity(data.quantite);
    if (!quantity.valid) return { success: false, error: quantity.error };
    const qty = quantity.value;

    const reference = String(data.reference || '').slice(0, 200);
    const destination = String(data.destination || '').slice(0, 300);
    const observation = String(data.observation || '').slice(0, 1000);
    const prixUnitaire = Number(data.prix_unitaire || 0);

    const transaction = db.transaction(() => {
      const produit = stmts.stmtGetProduitById.get(produitId);
      if (!produit) throw new Error('Produit non trouvé');

      const ancienStock = Number(produit.quantite_stock || 0);
      if (qty > ancienStock) throw new Error(`Stock insuffisant! Disponible: ${ancienStock}, demandé: ${qty}`);

      const nouveauStock = ancienStock - qty;
      const stockUpdate = db.prepare(`
        UPDATE produits SET quantite_stock = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND quantite_stock >= ?
      `).run(nouveauStock, produitId, qty);
      if (stockUpdate.changes !== 1) throw new Error('Stock modifié par une autre opération. Réessayez.');

      stmts.stmtInsertSortie.run(produitId, qty, Number.isFinite(prixUnitaire) ? prixUnitaire : 0, reference, destination, observation);

      const mouvement = stmts.stmtInsertMouvement.run(
        produitId, 'SORTIE', qty, ancienStock, nouveauStock, reference,
        `Sortie de stock - ${destination}`,
        Number.isFinite(prixUnitaire) ? prixUnitaire : 0,
        validateId(userId)
      );

      return {
        mouvementId: Number(mouvement.lastInsertRowid),
        produitId, qty, ancienStock, nouveauStock, reference
      };
    });

    const result = transaction();

    emitMouvementAdded({
      id: result.mouvementId,
      produit_id: result.produitId,
      type_mouvement: 'SORTIE',
      quantite: result.qty,
      ancien_stock: result.ancienStock,
      nouveau_stock: result.nouveauStock,
      reference: result.reference,
      prix_unitaire: Number.isFinite(prixUnitaire) ? prixUnitaire : 0,
      date_mouvement: new Date().toISOString()
    });

    triggerSnapshotUpdate('create-sortie');

    return { success: true, data: result };
  }));

  // ============================================================
  // GET STATS
  // ============================================================
  ipcMain.handle('stock:get-stats', withDb((db, stmts) => {
    const stmt = db.prepare(`
      SELECT COUNT(*) AS total, 
        COALESCE(SUM(CASE WHEN quantite_stock <= 0 THEN 1 ELSE 0 END), 0) AS rupture, 
        COALESCE(SUM(CASE WHEN quantite_stock > 0 AND quantite_stock <= quantite_minimale THEN 1 ELSE 0 END), 0) AS alerte, 
        COALESCE(SUM(CASE WHEN quantite_stock > quantite_minimale THEN 1 ELSE 0 END), 0) AS normal, 
        COALESCE(SUM(quantite_stock * prix_vente), 0) AS valeur_totale 
      FROM produits WHERE status = 'actif'
    `);
    return { success: true, data: stmt.get() };
  }));

  ipcMain.handle('stock:get-entrees-stats', withDb((db, stmts) => {
    return { success: true, data: stmts.stmtGetEntreesStats.get() };
  }));

  ipcMain.handle('stock:get-sorties-stats', withDb((db, stmts) => {
    return { success: true, data: stmts.stmtGetSortiesStats.get() };
  }));

  // ============================================================
  // BULK DELETE — MOUVEMENTS
  // ============================================================
  ipcMain.handle('stock:bulk-delete-mouvements', withDb((db, stmts, event, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "Liste d'IDs invalide" };
    const safeIds = ids.map(Number).filter(id => Number.isInteger(id) && id > 0).slice(0, 1000);
    if (!safeIds.length) return { success: false, error: 'Aucun ID valide' };

    const placeholders = safeIds.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM mouvements_stock WHERE id IN (${placeholders})`).run(...safeIds);

    triggerSnapshotUpdate('bulk-delete-mouvements');

    return { success: true, deleted: result.changes };
  }));

  // ============================================================
  // BULK DELETE — ENTREES
  // ============================================================
  ipcMain.handle('stock:bulk-delete-entrees', withDb((db, stmts, event, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "Liste d'IDs invalide" };
    const safeIds = ids.map(Number).filter(id => Number.isInteger(id) && id > 0).slice(0, 1000);
    if (!safeIds.length) return { success: false, error: 'Aucun ID valide' };

    const placeholders = safeIds.map(() => '?').join(',');

    const transaction = db.transaction(() => {
      const entrees = db.prepare(`SELECT id, produit_id, quantite FROM entrees_stock WHERE id IN (${placeholders})`).all(...safeIds);
      for (const entree of entrees) {
        const produit = db.prepare(`SELECT quantite_stock FROM produits WHERE id = ?`).get(entree.produit_id);
        if (!produit) continue;
        const nouveauStock = Math.max(0, Number(produit.quantite_stock || 0) - Number(entree.quantite || 0));
        db.prepare(`UPDATE produits SET quantite_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(nouveauStock, entree.produit_id);
        db.prepare(`
          UPDATE produits SET statut_stock = CASE 
            WHEN quantite_stock <= 0 THEN 'rupture' 
            WHEN quantite_stock <= quantite_minimale THEN 'alerte' 
            ELSE 'disponible' 
          END WHERE id = ?
        `).run(entree.produit_id);
      }
      const deleted = db.prepare(`DELETE FROM entrees_stock WHERE id IN (${placeholders})`).run(...safeIds);
      return deleted.changes;
    });

    const deleted = transaction();

    triggerSnapshotUpdate('bulk-delete-entrees');

    return { success: true, deleted };
  }));

  // ============================================================
  // BULK DELETE — SORTIES
  // ============================================================
  ipcMain.handle('stock:bulk-delete-sorties', withDb((db, stmts, event, ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "Liste d'IDs invalide" };
    const safeIds = ids.map(Number).filter(id => Number.isInteger(id) && id > 0).slice(0, 1000);
    if (!safeIds.length) return { success: false, error: 'Aucun ID valide' };

    const placeholders = safeIds.map(() => '?').join(',');

    const transaction = db.transaction(() => {
      const sorties = db.prepare(`SELECT id, produit_id, quantite FROM sorties_stock WHERE id IN (${placeholders})`).all(...safeIds);
      for (const sortie of sorties) {
        const produit = db.prepare(`SELECT quantite_stock FROM produits WHERE id = ?`).get(sortie.produit_id);
        if (!produit) continue;
        const nouveauStock = Number(produit.quantite_stock || 0) + Number(sortie.quantite || 0);
        db.prepare(`UPDATE produits SET quantite_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(nouveauStock, sortie.produit_id);
        db.prepare(`
          UPDATE produits SET statut_stock = CASE 
            WHEN quantite_stock <= 0 THEN 'rupture' 
            WHEN quantite_stock <= quantite_minimale THEN 'alerte' 
            ELSE 'disponible' 
          END WHERE id = ?
        `).run(sortie.produit_id);
      }
      const deleted = db.prepare(`DELETE FROM sorties_stock WHERE id IN (${placeholders})`).run(...safeIds);
      return deleted.changes;
    });

    const deleted = transaction();

    triggerSnapshotUpdate('bulk-delete-sorties');

    return { success: true, deleted };
  }));

  log('✅ [stock.handlers] Enregistrés (withDb + auto-forceReconnect)');
  return true;
}

module.exports = { registerStockHandlers };