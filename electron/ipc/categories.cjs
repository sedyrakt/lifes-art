'use strict';
// ============================================================
// electron/ipc/categories/handlers.cjs
// ⭐ FIX: withDb → auto-forceReconnect raha tsy misokatra ny DB
// ⭐ FIX: Default sort = 'created_at DESC' → ny catégorie vaovao no voalohany
// ⭐ FIX: Tie-breaker 'c.id DESC' raha mitovy ny created_at
// ⭐ FIX: audit userId avy amin'ny event?.sender?.user?.id
// ============================================================

const { getDb, forceReconnect } = require('../database/connection.cjs');
const { BrowserWindow } = require('electron');

const DEBUG = false;

function log(...args) { if (DEBUG) console.log(...args); }
function error(...args) { console.error(...args); }

function getMainWindow() {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function emitCategoriesChanged(data) {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('categories:changed', data);
  }
}

// ⭐⭐⭐ WRAPPER: withDb — auto-reconnect + centralized error handling ⭐⭐⭐
function withDb(fn) {
  return (event, ...args) => {
    try {
      let db = getDb();

      if (!db || !db.open) {
        console.warn('⚠️ [categories] DB closed! Trying forceReconnect...');
        try {
          db = forceReconnect();
        } catch (reconnectErr) {
          error('❌ [categories] forceReconnect failed:', reconnectErr?.message);
        }
      }

      if (!db || !db.open) {
        error('❌ [categories] Database connection is not open après forceReconnect');
        return { success: false, error: 'Database connection is not open' };
      }

      return fn(db, event, ...args);
    } catch (err) {
      error('❌ [categories] withDb:', err?.message || err);
      return { success: false, error: err?.message || 'Erreur interne categories' };
    }
  };
}

// ⭐ FIX: Default sort = 'created_at DESC' (Plus récent)
const DEFAULT_SORT_FIELD = 'created_at';
const DEFAULT_SORT_DIRECTION = 'DESC';
const ALLOWED_SORT_FIELDS = ['nom', 'description', 'created_at', 'id'];

function buildCategoriesQuery(db, options = {}) {
  const { limit, offset, page, search } = options;

  // ⭐ FIX: Default = 'created_at' DESC
  let sortField = DEFAULT_SORT_FIELD;
  let sortDirection = DEFAULT_SORT_DIRECTION;

  if (options.sort && typeof options.sort === 'object') {
    sortField = options.sort.field || sortField;
    sortDirection = options.sort.direction === 'DESC' ? 'DESC' : (options.sort.direction === 'ASC' ? 'ASC' : sortDirection);
  } else if (options.sortBy) {
    sortField = options.sortBy;
    sortDirection = options.sortOrder === 'DESC' ? 'DESC' : (options.sortOrder === 'ASC' ? 'ASC' : sortDirection);
  }

  // ⭐ FIX: Fallback raha diso ny sortField
  if (!ALLOWED_SORT_FIELDS.includes(sortField)) {
    sortField = DEFAULT_SORT_FIELD;
    sortDirection = DEFAULT_SORT_DIRECTION;
  }

  // ⭐ FIX: Raha 'created_at' no field na tsy nomena direction → DESC
  if (sortField === 'created_at' && !options.sort?.direction && !options.sortOrder) {
    sortDirection = DEFAULT_SORT_DIRECTION;
  }

  let query = `
    SELECT c.*, 
      (SELECT COUNT(*) FROM produits WHERE categorie_id = c.id) AS produits_count
    FROM categories c
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ' AND (c.nom LIKE ? OR c.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  // ⭐ FIX: Tie-breaker 'c.id DESC' ho an'ny catégorie mitovy created_at
  query += ` ORDER BY c.${sortField} ${sortDirection}, c.id DESC`;

  let finalLimit = limit ? Math.max(1, Math.min(parseInt(limit) || 8, 100)) : 8;
  let finalOffset = 0;

  if (page) {
    const p = Math.max(parseInt(page), 1);
    finalOffset = (p - 1) * finalLimit;
  } else if (offset !== undefined) {
    finalOffset = Math.max(0, parseInt(offset) || 0);
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(finalLimit, finalOffset);

  return { query, params };
}

function buildCategoriesCountQuery(db, options = {}) {
  const { search } = options;
  let query = 'SELECT COUNT(*) as total FROM categories c WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (c.nom LIKE ? OR c.description LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s);
  }

  return { query, params };
}

function validateCategory(data) {
  const errors = [];
  const nom = data.nom?.trim() || '';
  const description = data.description?.trim() || '';

  if (!nom) errors.push('Le nom de la catégorie est obligatoire');
  else if (nom.length < 2) errors.push('Le nom doit contenir au moins 2 caractères');
  else if (nom.length > 100) errors.push('Le nom ne peut pas dépasser 100 caractères');

  if (description && description.length > 500) errors.push('La description ne peut pas dépasser 500 caractères');

  return { valid: errors.length === 0, errors, data: { nom, description } };
}

function logAudit(action, categoryId, categoryName, userId, details = '') {
  try {
    const db = getDb();
    if (!db || !db.open) return;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at)
      VALUES (?, 'categorie', ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(action, categoryId, categoryName, userId, details);
  } catch (err) {
    error('⚠️ Erreur audit log:', err.message);
  }
}

function registerCategoriesHandlers(ipcMain) {
  if (DEBUG) log('📑 [categories.cjs] ENREGISTREMENT HANDLERS');
  if (!ipcMain) {
    error('❌ ipcMain est null/undefined!');
    return false;
  }

  const channels = [
    'categories:get-all',
    'categories:get-by-id',
    'categories:create',
    'categories:update',
    'categories:delete',
    'categories:get-products-count',
    'categories:search',
    'categories:bulk-delete',
    'categories:get-stats'
  ];
  channels.forEach(ch => {
    try { ipcMain.removeHandler(ch); } catch (_) {}
  });

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET ALL
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:get-all', withDb((db, event, options = {}) => {
    const { query, params } = buildCategoriesQuery(db, options);
    const data = db.prepare(query).all(params);

    const { query: countQuery, params: countParams } = buildCategoriesCountQuery(db, options);
    const countResult = db.prepare(countQuery).get(countParams);

    return {
      success: true,
      data: data,
      pagination: {
        total: countResult?.total || 0,
        limit: options.limit ? Math.min(parseInt(options.limit), 100) : data.length,
        offset: options.offset ? parseInt(options.offset) : 0,
        page: parseInt(options.page) || 1
      }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET BY ID
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:get-by-id', withDb((db, event, id) => {
    if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID de catégorie invalide' };
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    const data = stmt.get(parseInt(id));
    if (!data) return { success: false, error: 'Catégorie non trouvée' };
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ CREATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:create', withDb((db, event, data, userId = null) => {
    const validation = validateCategory(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };

    const { nom, description } = validation.data;
    const checkStmt = db.prepare('SELECT id FROM categories WHERE LOWER(nom) = LOWER(?)');
    const existing = checkStmt.get(nom);
    if (existing) return { success: false, error: `La catégorie "${nom}" existe déjà` };

    const insertStmt = db.prepare('INSERT INTO categories (nom, description) VALUES (?, ?)');
    const result = insertStmt.run(nom, description);
    const categoryId = result.lastInsertRowid;

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('create', categoryId, nom, auditUser);

    emitCategoriesChanged({ type: 'create', id: categoryId, nom });

    return { success: true, data: { id: categoryId, nom, description } };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ UPDATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:update', withDb((db, event, id, data, userId = null) => {
    if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID de catégorie invalide' };
    const categoryId = parseInt(id);

    const getStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    const existing = getStmt.get(categoryId);
    if (!existing) return { success: false, error: 'Catégorie non trouvée' };

    const validation = validateCategory(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };

    const { nom, description } = validation.data;
    const checkStmt = db.prepare('SELECT id FROM categories WHERE LOWER(nom) = LOWER(?) AND id != ?');
    const duplicate = checkStmt.get(nom, categoryId);
    if (duplicate) return { success: false, error: `La catégorie "${nom}" existe déjà` };

    const updateStmt = db.prepare('UPDATE categories SET nom = ?, description = ? WHERE id = ?');
    updateStmt.run(nom, description, categoryId);

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('update', categoryId, nom, auditUser, `Ancien nom: ${existing.nom}`);

    emitCategoriesChanged({ type: 'update', id: categoryId, nom });

    return { success: true, data: { id: categoryId, nom, description } };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:delete', withDb((db, event, id, userId = null) => {
    if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID de catégorie invalide' };
    const categoryId = parseInt(id);

    const getStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    const existing = getStmt.get(categoryId);
    if (!existing) return { success: false, error: 'Catégorie non trouvée' };

    const productCountStmt = db.prepare('SELECT COUNT(*) as total FROM produits WHERE categorie_id = ?');
    const productCount = productCountStmt.get(categoryId);
    if (productCount && productCount.total > 0) {
      return {
        success: false,
        error: `Impossible de supprimer "${existing.nom}". ${productCount.total} produit(s) l'utilisent.`,
        data: { productsCount: productCount.total }
      };
    }

    const auditUser = userId || event?.sender?.user?.id || null;
    if (auditUser) logAudit('delete', categoryId, existing.nom, auditUser);

    const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ?');
    deleteStmt.run(categoryId);

    emitCategoriesChanged({ type: 'delete', id: categoryId, nom: existing.nom });

    return { success: true, data: { id: categoryId, nom: existing.nom } };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET PRODUCTS COUNT
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:get-products-count', withDb((db, event, id) => {
    if (!id || isNaN(id)) return { success: false, error: 'ID invalide' };
    const stmt = db.prepare('SELECT COUNT(*) as total FROM produits WHERE categorie_id = ?');
    const result = stmt.get(parseInt(id));
    return { success: true, data: { count: result?.total || 0 } };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ SEARCH
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:search', withDb((db, event, searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      return { success: false, error: 'Le terme de recherche doit contenir au moins 2 caractères' };
    }
    const stmt = db.prepare('SELECT * FROM categories WHERE nom LIKE ? ORDER BY nom LIMIT 50');
    const data = stmt.all(`%${searchTerm}%`);
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ BULK DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:bulk-delete', withDb((db, event, ids, userId = null) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: "Liste d'IDs invalide" };
    }

    const deleted = [];
    const errors = [];
    const auditUser = userId || event?.sender?.user?.id || null;

    const transaction = db.transaction((idsToDelete) => {
      const getCatStmt = db.prepare('SELECT id, nom FROM categories WHERE id = ?');
      const productCountStmt = db.prepare('SELECT COUNT(*) as total FROM produits WHERE categorie_id = ?');
      const deleteStmt = db.prepare('DELETE FROM categories WHERE id = ?');

      for (const id of idsToDelete) {
        const existing = getCatStmt.get(id);
        if (!existing) {
          errors.push({ id, error: 'Catégorie non trouvée' });
          continue;
        }
        const productCount = productCountStmt.get(id);
        if (productCount && productCount.total > 0) {
          errors.push({ id, nom: existing.nom, error: `${productCount.total} produit(s) l'utilisent` });
          continue;
        }
        if (auditUser) logAudit('bulk_delete', id, existing.nom, auditUser);
        deleteStmt.run(id);
        deleted.push({ id, nom: existing.nom });
      }
    });

    transaction(ids);

    if (deleted.length > 0) emitCategoriesChanged({ type: 'bulk_delete', count: deleted.length });

    return {
      success: true,
      data: {
        deleted,
        errors,
        total: ids.length,
        deletedCount: deleted.length,
        errorCount: errors.length
      }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐⭐⭐ GET STATS ⭐⭐⭐
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('categories:get-stats', withDb((db, event) => {
    const stmt = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM categories) AS total,
        (SELECT COUNT(*) FROM categories WHERE description IS NOT NULL AND TRIM(description) != '') AS avecDescription,
        (SELECT COUNT(*) FROM categories WHERE description IS NULL OR TRIM(description) = '') AS sansDescription,
        (SELECT COUNT(*) FROM produits) AS totalProduits,
        (SELECT COUNT(*) FROM categories c WHERE NOT EXISTS (
          SELECT 1 FROM produits p WHERE p.categorie_id = c.id
        )) AS categoriesVides,
        (SELECT COALESCE(SUM(quantite_stock), 0) FROM produits) AS totalStock,
        (SELECT COALESCE(SUM(quantite_stock * prix_vente), 0) FROM produits) AS valeurStock
    `);

    const data = stmt.get() || {};

    return {
      success: true,
      data: {
        total: Number(data.total) || 0,
        avecDescription: Number(data.avecDescription) || 0,
        sansDescription: Number(data.sansDescription) || 0,
        totalProduits: Number(data.totalProduits) || 0,
        categoriesVides: Number(data.categoriesVides) || 0,
        totalStock: Number(data.totalStock) || 0,
        valeurStock: Number(data.valeurStock) || 0,
        avec_description: Number(data.avecDescription) || 0,
        sans_description: Number(data.sansDescription) || 0,
        total_produits: Number(data.totalProduits) || 0,
        categories_vides: Number(data.categoriesVides) || 0,
        total_stock: Number(data.totalStock) || 0,
        valeur_stock: Number(data.valeurStock) || 0,
      },
    };
  }));

  if (DEBUG) log('📋 [categories.cjs] Tous les handlers sont enregistrés avec succès');
  return true;
}

module.exports = { registerCategoriesHandlers, emitCategoriesChanged };