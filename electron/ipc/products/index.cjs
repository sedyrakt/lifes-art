// electron/ipc/products/index.cjs
// ⭐ UNIQUE VERSION — HARD DELETE + type_produit + code séquentiel
// ⭐ FIX: withDbCheck → auto-forceReconnect
// ⭐ FIX LOGIQUE ERP STANDARD:
//    - Prix de vente : 'fini' IHANY (required)
//    - Prix d'achat  : required ho 'matiere_premiere'
//    - Fournisseur   : required ho 'matiere_premiere'
//    - Stock initial : ACCEPTÉ ho type rehetra (facultatif, 0 default)
//    - Stock minimum : ACCEPTÉ ho type rehetra (facultatif)
'use strict';

const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { logAudit } = require('./audit.cjs');
const { log, error } = require('./logger.cjs');
const { buildProductsQuery, buildProductsCountQuery } = require('./queries.cjs');
const { prepareStatements } = require('./statements.cjs');

const DEBUG = false;

const TYPES_PRODUIT = new Set(['fini', 'matiere_premiere', 'fourniture']);
const DEFAULT_TYPE = 'fini';

function normalizeId(value) {
  const id = Number.parseInt(value, 10);
  return (Number.isInteger(id) && id > 0) ? id : null;
}

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTypeProduit(value) {
  const t = String(value || '').trim().toLowerCase();
  return TYPES_PRODUIT.has(t) ? t : DEFAULT_TYPE;
}

function getUserId(event, fallback = null) {
  try {
    const userId = event?.sender?.user?.id;
    if (userId !== undefined && userId !== null) return Number(userId);
  } catch (_) {}
  return fallback;
}

function withDbCheck(fn) {
  return (event, ...args) => {
    try {
      let db = getDb();
      if (!db || !db.open) {
        try { db = forceReconnect(); } catch (reconnectErr) {
          console.error('❌ [products] forceReconnect failed:', reconnectErr?.message);
        }
      }
      if (!db || !db.open) {
        console.error('[❌ products] Database connection is not open après forceReconnect');
        return { success: false, error: 'Database connection is not open' };
      }
      return fn(db, event, ...args);
    } catch (err) {
      console.error('❌ [products] withDbCheck:', err?.message || err);
      return { success: false, error: err?.message || 'Products database error' };
    }
  };
}

function emitProductsChanged(productData) {
  try {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    if (!windows.length) return;
    for (const win of windows) {
      if (!win || win.isDestroyed()) continue;
      try { win.webContents.send('products:changed', productData); } catch (err) {}
    }
  } catch (err) {}
}

function ensureTypeProduitColumn(db) {
  try {
    const columns = db.prepare(`PRAGMA table_info(produits)`).all();
    const hasType = columns.some(c => c.name === 'type_produit');
    if (!hasType) {
      console.log('🔧 [products] Ajout de la colonne type_produit...');
      db.exec(`ALTER TABLE produits ADD COLUMN type_produit TEXT DEFAULT 'fini'`);
      db.exec(`UPDATE produits SET type_produit = 'matiere_premiere' WHERE fournisseur_id IS NOT NULL AND (type_produit IS NULL OR type_produit = '')`);
      db.exec(`UPDATE produits SET type_produit = 'fini' WHERE fournisseur_id IS NULL AND (type_produit IS NULL OR type_produit = '')`);
      console.log('✅ [products] Colonne type_produit ajoutée et initialisée');
    }
  } catch (err) {
    console.error('❌ [products] Migration type_produit:', err.message);
  }
}

function getCodePrefix(nom = '') {
  const clean = String(nom || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return clean.slice(0, 4).padEnd(3, 'X') || 'PRD';
}

function generateUniqueCode(db, requestedCode = null, nom = '') {
  if (requestedCode) {
    const existing = db.prepare('SELECT id FROM produits WHERE code = ?').get(requestedCode);
    if (!existing) return requestedCode;
  }
  const prefix = getCodePrefix(nom);
  const pattern = `${prefix}-%`;
  const rows = db.prepare('SELECT code FROM produits WHERE code LIKE ? ORDER BY code DESC').all(pattern);
  let maxSeq = 0;
  for (const row of rows) {
    const match = String(row.code).match(/-(\d+)$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  const nextSeq = maxSeq + 1;
  let code = `${prefix}-${String(nextSeq).padStart(3, '0')}`;
  let attempts = 0;
  while (db.prepare('SELECT id FROM produits WHERE code = ?').get(code) && attempts < 10) {
    attempts++;
    code = `${prefix}-${String(nextSeq + attempts).padStart(3, '0')}`;
  }
  return code;
}

function registerProductsHandlers(ipcMain) {
  if (DEBUG) log('🔥 REGISTER PRODUCTS HANDLERS');
  if (!ipcMain) throw new Error('ipcMain est null/undefined');

  if (!prepareStatements()) {
    error('❌ Impossible de préparer les statements produits');
    return false;
  }

  try {
    const db = getDb();
    if (db && db.open) ensureTypeProduitColumn(db);
  } catch (err) {
    error('❌ [products] Migration initiale:', err.message);
  }

  const channels = [
    'products:get-all','products:get-by-id','products:get-by-code','products:create',
    'products:update','products:delete','products:get-alertes','products:get-top',
    'products:get-by-categorie','products:search','products:update-stock',
    'products:get-stats','products:bulk-delete'
  ];
  for (const ch of channels) { try { ipcMain.removeHandler(ch); } catch (_) {} }

  // ═══════════════════════════════════════════════════════════
  // GET ALL
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:get-all', withDbCheck((db, event, options = {}) => {
    ensureTypeProduitColumn(db);
    const dataQuery = buildProductsQuery(options);
    const countQuery = buildProductsCountQuery(options);
    const data = db.prepare(dataQuery.query).all(...dataQuery.params);
    const totalRow = db.prepare(countQuery.query).get(...countQuery.params);
    const total = totalRow?.total || 0;
    const totalPages = Math.ceil(total / dataQuery.limit);
    return {
      success: true, data,
      pagination: {
        total, totalPages,
        page: dataQuery.page, limit: dataQuery.limit, offset: dataQuery.offset,
        hasNextPage: dataQuery.page < totalPages,
        hasPreviousPage: dataQuery.page > 1,
      },
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY ID
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:get-by-id', withDbCheck((db, event, id) => {
    ensureTypeProduitColumn(db);
    const productId = normalizeId(id);
    if (!productId) return { success: false, error: 'ID invalide' };
    const produit = db.prepare(`
      SELECT p.id, p.code, p.nom, p.description, p.categorie_id, p.fournisseur_id,
        p.prix_achat, p.prix_vente, p.quantite_stock, p.quantite_minimale, p.unite, p.tva_rate,
        p.type_produit, p.statut_stock, p.created_at, p.updated_at,
        c.nom AS categorie_nom, f.nom AS fournisseur_nom,
        (SELECT COUNT(DISTINCT dc.commande_id) FROM details_commandes dc WHERE dc.produit_id = p.id) AS nb_commandes
      FROM produits p
      LEFT JOIN categories c ON c.id = p.categorie_id
      LEFT JOIN fournisseurs f ON f.id = p.fournisseur_id
      WHERE p.id = ?
    `).get(productId);
    if (!produit) return { success: false, error: 'Produit non trouvé' };
    return { success: true, data: produit };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY CODE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:get-by-code', withDbCheck((db, event, code) => {
    ensureTypeProduitColumn(db);
    const safeCode = String(code || '').trim();
    if (!safeCode) return { success: false, error: 'Code invalide' };
    const produit = db.prepare(`
      SELECT p.id, p.code, p.nom, p.description, p.categorie_id, p.fournisseur_id,
        p.prix_achat, p.prix_vente, p.quantite_stock, p.quantite_minimale, p.unite, p.tva_rate,
        p.type_produit, p.statut_stock, p.created_at, p.updated_at, c.nom AS categorie_nom
      FROM produits p
      LEFT JOIN categories c ON c.id = p.categorie_id
      WHERE p.code = ? LIMIT 1
    `).get(safeCode);
    if (!produit) return { success: false, error: 'Produit non trouvé' };
    return { success: true, data: produit };
  }));

  // ═══════════════════════════════════════════════════════════
  // CREATE — LOGIQUE ERP STANDARD
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:create', withDbCheck((db, event, data = {}) => {
    ensureTypeProduitColumn(db);
    let code = String(data.code || '').trim();
    const nom = String(data.nom || '').trim();
    if (!nom) return { success: false, error: 'Nom requis' };

    code = generateUniqueCode(db, code || null, nom);

    const typeProduit = normalizeTypeProduit(data.type_produit);
    const isFini = typeProduit === 'fini';
    const isMatiere = typeProduit === 'matiere_premiere';

    // ⭐ Fournisseur obligatoire ho 'matiere_premiere'
    const fournisseurId = data.fournisseur_id ? normalizeId(data.fournisseur_id) : null;
    if (isMatiere && !fournisseurId) {
      return { success: false, error: 'Fournisseur requis pour la matière première' };
    }

    // ⭐ Prix de vente required HO AN'NY 'fini' IHANY
    const prixVente = isFini ? numberOr(data.prix_vente, 0) : 0;
    if (isFini && prixVente <= 0) {
      return { success: false, error: 'Prix de vente > 0 requis (produit fini)' };
    }

    // ⭐ Prix d'achat required HO AN'NY 'matiere_premiere'
    const prixAchat = numberOr(data.prix_achat, 0);
    if (isMatiere && prixAchat <= 0) {
      return { success: false, error: 'Prix d\'achat > 0 requis (matière première)' };
    }

    // ⭐ ERP STANDARD : Stock initial accepté pour TOUS (facultatif, 0 default)
    const stock = Math.max(0, Number.parseInt(data.quantite_stock, 10) || 0);

    // ⭐ ERP STANDARD : Stock minimum accepté pour TOUS (facultatif)
    const quantiteMinimale = Math.max(0, Number.parseInt(data.quantite_minimale, 10) || 0);

    const result = db.prepare(`
      INSERT INTO produits (code, nom, description, categorie_id, fournisseur_id,
        prix_achat, prix_vente, quantite_stock, quantite_minimale, unite, status, tva_rate, type_produit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif', ?, ?)
      RETURNING *
    `).get(
      code, nom, String(data.description || '').trim(),
      data.categorie_id ? normalizeId(data.categorie_id) : null,
      fournisseurId,
      prixAchat, prixVente, stock,
      quantiteMinimale,
      String(data.unite || 'pièce').trim(),
      numberOr(data.tva_rate, 0.2),
      typeProduit
    );
    const productId = result.id;
    logAudit('create', productId, code, getUserId(event), `Création: ${nom} (${typeProduit})`);
    emitProductsChanged({ type: 'created', id: productId, nom, code });
    return { success: true, data: result };
  }));

  // ═══════════════════════════════════════════════════════════
  // UPDATE — LOGIQUE ERP STANDARD
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:update', withDbCheck((db, event, id, data = {}) => {
    ensureTypeProduitColumn(db);
    const productId = normalizeId(id);
    if (!productId) return { success: false, error: 'ID invalide' };
    const existing = db.prepare('SELECT * FROM produits WHERE id = ?').get(productId);
    if (!existing) return { success: false, error: 'Produit non trouvé' };

    let code = String(data.code || '').trim();
    const nom = String(data.nom || '').trim();
    if (!nom) return { success: false, error: 'Nom requis' };

    if (!code) code = existing.code;
    else {
      const codeOwner = db.prepare('SELECT id FROM produits WHERE code = ?').get(code);
      if (codeOwner && Number(codeOwner.id) !== productId) {
        code = generateUniqueCode(db, null, nom);
      }
    }

    const typeProduit = normalizeTypeProduit(data.type_produit || existing.type_produit);
    const isFini = typeProduit === 'fini';
    const isMatiere = typeProduit === 'matiere_premiere';

    // ⭐ Fournisseur obligatoire ho 'matiere_premiere'
    const fournisseurId = data.fournisseur_id ? normalizeId(data.fournisseur_id) : null;
    if (isMatiere && !fournisseurId) {
      return { success: false, error: 'Fournisseur requis pour la matière première' };
    }

    // ⭐ Prix de vente required HO AN'NY 'fini' IHANY
    const prixVente = isFini ? numberOr(data.prix_vente, 0) : 0;
    if (isFini && prixVente <= 0) {
      return { success: false, error: 'Prix de vente > 0 requis (produit fini)' };
    }

    // ⭐ Prix d'achat required HO AN'NY 'matiere_premiere'
    const prixAchat = numberOr(data.prix_achat, 0);
    if (isMatiere && prixAchat <= 0) {
      return { success: false, error: 'Prix d\'achat > 0 requis (matière première)' };
    }

    // ⭐ ERP STANDARD : Stock initial accepté pour TOUS (facultatif)
    const stock = Math.max(0, Number.parseInt(data.quantite_stock, 10) || 0);

    // ⭐ ERP STANDARD : Stock minimum accepté pour TOUS (facultatif)
    const quantiteMinimale = Math.max(0, Number.parseInt(data.quantite_minimale, 10) || 0);

    const result = db.prepare(`
      UPDATE produits SET code=?, nom=?, description=?, categorie_id=?, fournisseur_id=?,
        prix_achat=?, prix_vente=?, quantite_stock=?, quantite_minimale=?, unite=?, tva_rate=?, type_produit=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=?
      RETURNING *
    `).get(
      code, nom, String(data.description || '').trim(),
      data.categorie_id ? normalizeId(data.categorie_id) : null,
      fournisseurId,
      prixAchat, prixVente, stock,
      quantiteMinimale,
      String(data.unite || 'pièce').trim(),
      numberOr(data.tva_rate, 0.2),
      typeProduit, productId
    );
    logAudit('update', productId, code, getUserId(event), `Mise à jour: ${nom} (${typeProduit})`);
    emitProductsChanged({ type: 'updated', id: productId, nom, code });
    return { success: true, data: result };
  }));

  // ═══════════════════════════════════════════════════════════
  // DELETE — HARD DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:delete', withDbCheck((db, event, id) => {
    const productId = normalizeId(id);
    if (!productId) return { success: false, error: 'ID invalide' };
    const existing = db.prepare('SELECT id, code, nom FROM produits WHERE id = ?').get(productId);
    if (!existing) return { success: false, error: 'Produit non trouvé' };
    db.prepare('DELETE FROM produits WHERE id = ?').run(productId);
    logAudit('delete', productId, existing.code, getUserId(event), `Supprimé: ${existing.nom}`);
    emitProductsChanged({ type: 'deleted', id: productId, nom: existing.nom, code: existing.code });
    return { success: true, data: { action: 'hard_delete', id: productId } };
  }));

  // ═══════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:get-stats', withDbCheck((db, event) => {
    ensureTypeProduitColumn(db);

    const row = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status != 'archive' THEN 1 END) AS total,
        COALESCE(SUM(CASE WHEN status != 'archive' 
          THEN COALESCE(quantite_stock, 0) ELSE 0 END), 0) AS totalStock,
        COUNT(CASE WHEN COALESCE(quantite_stock, 0) <= 0 THEN 1 END) AS rupture,
        COUNT(CASE WHEN COALESCE(quantite_stock, 0) > 0 
          AND COALESCE(quantite_stock, 0) <= COALESCE(quantite_minimale, 0) THEN 1 END) AS alerte,
        COALESCE(SUM(CASE WHEN status != 'archive' 
          THEN COALESCE(quantite_stock, 0) * COALESCE(prix_vente, 0) 
          ELSE 0 END), 0) AS valeur_totale
      FROM produits
    `).get();

    const byType = db.prepare(`
      SELECT type_produit, COUNT(*) AS total, COALESCE(SUM(quantite_stock), 0) AS stock
      FROM produits
      WHERE status != 'archive'
      GROUP BY type_produit
    `).all();

    return {
      success: true,
      data: {
        total: Number(row?.total || 0),
        totalStock: Number(row?.totalStock || 0),
        rupture: Number(row?.rupture || 0),
        alerte: Number(row?.alerte || 0),
        valeur_totale: Number(row?.valeur_totale || 0),
        byType: byType || [],
      },
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // ALERTES
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:get-alertes', withDbCheck((db, event, limit = 100) => {
    ensureTypeProduitColumn(db);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return {
      success: true,
      data: db.prepare(`
        SELECT id, code, nom, prix_vente, quantite_stock, quantite_minimale, type_produit
        FROM produits
        WHERE quantite_stock <= quantite_minimale
        ORDER BY quantite_stock ASC, id ASC LIMIT ?
      `).all(safeLimit),
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // TOP
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:get-top', withDbCheck((db, event, limit = 10) => {
    ensureTypeProduitColumn(db);
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const sql = `
      SELECT p.id, p.nom, p.code, p.prix_vente, p.type_produit,
        COALESCE(SUM(dc.quantite), 0) AS total_vendu,
        COALESCE(COUNT(DISTINCT dc.commande_id), 0) AS nb_commandes,
        COALESCE(SUM(dc.total), 0) AS total_ca
      FROM produits p
      LEFT JOIN details_commandes dc ON dc.produit_id = p.id
      LEFT JOIN commandes c ON c.id = dc.commande_id AND c.statut != 'Annulée'
      GROUP BY p.id
      ORDER BY total_vendu DESC, total_ca DESC
      LIMIT ?
    `;
    return { success: true, data: db.prepare(sql).all(safeLimit) };
  }));

  // ═══════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:search', withDbCheck((db, event, term, limit = 50) => {
    ensureTypeProduitColumn(db);
    const cleanTerm = String(term || '').trim();
    if (!cleanTerm) return { success: true, data: [], pagination: { count: 0 } };
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const terms = cleanTerm.split(/\s+/).filter(Boolean).map(t => `"${t.replace(/"/g, '""')}"*`).join(' AND ');
    return {
      success: true,
      data: db.prepare(`
        SELECT p.*, c.nom AS categorie_nom
        FROM produits_fts f
        INNER JOIN produits p ON p.id = f.rowid
        LEFT JOIN categories c ON c.id = p.categorie_id
        WHERE produits_fts MATCH ?
        ORDER BY p.nom COLLATE NOCASE ASC, p.id ASC LIMIT ?
      `).all(terms, safeLimit),
      pagination: { count: safeLimit },
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY CATEGORIE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:get-by-categorie', withDbCheck((db, event, categorieId, limit = 50) => {
    ensureTypeProduitColumn(db);
    const safeCategorieId = normalizeId(categorieId);
    if (!safeCategorieId) return { success: false, error: 'ID catégorie invalide' };
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const data = db.prepare(`
      SELECT p.*, c.nom AS categorie_nom
      FROM produits p
      LEFT JOIN categories c ON c.id = p.categorie_id
      WHERE p.categorie_id = ?
      ORDER BY p.nom COLLATE NOCASE ASC, p.id ASC LIMIT ?
    `).all(safeCategorieId, safeLimit);
    return { success: true, data };
  }));

  // ═══════════════════════════════════════════════════════════
  // UPDATE STOCK
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:update-stock', withDbCheck((db, event, id, quantite, type, userId = null) => {
    const productId = normalizeId(id);
    if (!productId) return { success: false, error: 'ID invalide' };
    const qty = Number(quantite);
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'Quantité positive requise' };
    if (type !== 'entree' && type !== 'sortie') return { success: false, error: 'Type invalide' };
    const produit = db.prepare('SELECT quantite_stock FROM produits WHERE id = ?').get(productId);
    if (!produit) return { success: false, error: 'Produit non trouvé' };
    const ancienStock = Number(produit.quantite_stock) || 0;
    let nouveauStock = ancienStock;
    if (type === 'entree') nouveauStock += qty;
    else {
      if (qty > ancienStock) return { success: false, error: `Stock insuffisant! Disponible: ${ancienStock}` };
      nouveauStock -= qty;
    }
    db.prepare(`UPDATE produits SET quantite_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(nouveauStock, productId);
    return { success: true, data: { ancienStock, nouveauStock } };
  }));

  // ═══════════════════════════════════════════════════════════
  // BULK DELETE — HARD DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('products:bulk-delete', withDbCheck((db, event, ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: 'Aucun produit sélectionné' };
    const validIds = [...new Set(ids.map(normalizeId).filter(Boolean))].slice(0, 500);
    if (!validIds.length) return { success: false, error: 'Liste d\'IDs invalide' };
    const placeholders = validIds.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM produits WHERE id IN (${placeholders})`);
    const result = db.transaction(() => stmt.run(...validIds))();
    emitProductsChanged({ type: 'bulk_deleted', ids: validIds });
    return { success: true, changes: result.changes };
  }));

  if (DEBUG) log('✅ Products handlers enregistrés avec succès');
  return true;
}

module.exports = { registerProductsHandlers, emitProductsChanged };