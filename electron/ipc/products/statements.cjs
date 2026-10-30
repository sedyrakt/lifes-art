// electron/ipc/products/statements.cjs
// ⭐ HARD DELETE — tsy misy soft delete intsony
// ⭐ ESORINA ny CASE WHEN 'inactif'
// ⭐ VAOVAO: `type_produit` ('fini' | 'matiere_premiere' | 'fourniture')
//    + auto-migration ao anaty prepareStatements()

'use strict';

const { getDb } = require('../../database/connection.cjs');

const DEBUG = false;

const log = (...args) => { if (DEBUG) console.log('[📦 Products]', ...args); };
const error = (...args) => console.error('[❌ Products]', ...args);

let stmtPrepared = false;

let stmtGetById = null;
let stmtGetByCode = null;
let stmtCreate = null;
let stmtUpdate = null;
let stmtDelete = null;
let stmtUpdateStock = null;
let stmtGetAlertes = null;
let stmtGetTop = null;
let stmtGetByCategorie = null;
let stmtSearchFTS = null;
let stmtSearchLike = null;
let stmtGetStats = null;
let stmtCheckUsage = null;

// ⭐ ESORINA ny CASE WHEN 'inactif' — tsy misy status intsony
// ⭐ VAOVAO: `p.type_produit` ao amin'ny SELECT
const PRODUCT_COLUMNS = `
  p.id, p.code, p.nom, p.description, p.categorie_id, p.fournisseur_id,
  p.prix_achat, p.prix_vente, p.quantite_stock, p.quantite_minimale,
  p.unite, p.tva_rate,
  p.type_produit,
  p.statut_stock, p.created_at, p.updated_at
`;

// ⭐ MIGRATION: Ampiana ny colonne type_produit raha tsy misy
function ensureTypeProduitColumn(db) {
  try {
    const columns = db.prepare(`PRAGMA table_info(produits)`).all();
    const hasType = columns.some(c => c.name === 'type_produit');
    if (!hasType) {
      console.log('🔧 [products:statements] Ajout de la colonne type_produit...');
      db.exec(`ALTER TABLE produits ADD COLUMN type_produit TEXT DEFAULT 'fini'`);
      // Init: si fournisseur_id → matiere_premiere, sinon fini
      db.exec(`UPDATE produits SET type_produit = 'matiere_premiere' WHERE fournisseur_id IS NOT NULL AND (type_produit IS NULL OR type_produit = '')`);
      db.exec(`UPDATE produits SET type_produit = 'fini' WHERE fournisseur_id IS NULL AND (type_produit IS NULL OR type_produit = '')`);
      console.log('✅ [products:statements] Colonne type_produit ajoutée et initialisée');
    }
  } catch (err) {
    console.error('❌ [products:statements] Migration type_produit:', err.message);
  }
}

function prepareStatements() {
  if (stmtPrepared) return true;
  if (DEBUG) log('📦 [products:statements] Preparing statements...');
  const db = getDb();
  if (!db) { error('❌ Database indisponible'); return false; }
  try {
    // ⭐ MIGRATION alohan'ny prepare (satria misy p.type_produit amin'ny SELECT)
    ensureTypeProduitColumn(db);

    stmtGetById = db.prepare(`
      SELECT ${PRODUCT_COLUMNS}, c.nom AS categorie_nom, f.nom AS fournisseur_nom
      FROM produits p
      LEFT JOIN categories c ON c.id = p.categorie_id
      LEFT JOIN fournisseurs f ON f.id = p.fournisseur_id
      WHERE p.id = ?
      LIMIT 1
    `);

    stmtGetByCode = db.prepare(`
      SELECT ${PRODUCT_COLUMNS}, c.nom AS categorie_nom
      FROM produits p
      LEFT JOIN categories c ON c.id = p.categorie_id
      WHERE p.code = ?
      LIMIT 1
    `);

    // ⭐ VAOVAO: type_produit amin'ny INSERT (default 'fini')
    stmtCreate = db.prepare(`
      INSERT INTO produits (code, nom, description, categorie_id, fournisseur_id,
        prix_achat, prix_vente, quantite_stock, quantite_minimale,
        unite, status, statut_stock, tva_rate, type_produit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'actif', 'disponible', ?, ?)
    `);

    // ⭐ VAOVAO: type_produit amin'ny UPDATE
    stmtUpdate = db.prepare(`
      UPDATE produits SET code = ?, nom = ?, description = ?, categorie_id = ?,
        fournisseur_id = ?, prix_achat = ?, prix_vente = ?, quantite_stock = ?,
        quantite_minimale = ?, unite = ?, tva_rate = ?, type_produit = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    // ⭐ HARD DELETE
    stmtDelete = db.prepare(`DELETE FROM produits WHERE id = ?`);

    stmtUpdateStock = db.prepare(`UPDATE produits SET quantite_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);

    // ⭐ VAOVAO: type_produit amin'ny SELECT
    stmtGetAlertes = db.prepare(`
      SELECT p.id, p.code, p.nom, p.prix_vente, p.quantite_stock, p.quantite_minimale, p.type_produit
      FROM produits p
      WHERE p.quantite_stock <= p.quantite_minimale
      ORDER BY p.quantite_stock ASC, p.id ASC LIMIT ?
    `);

    // ⭐ VAOVAO: type_produit amin'ny SELECT
    stmtGetTop = db.prepare(`
      SELECT p.id, p.nom, p.code, p.quantite_stock, p.prix_vente, p.type_produit
      FROM produits p
      WHERE p.quantite_stock > 0
      ORDER BY p.quantite_stock DESC, p.id ASC LIMIT ?
    `);

    stmtGetByCategorie = db.prepare(`
      SELECT ${PRODUCT_COLUMNS}, c.nom AS categorie_nom FROM produits p
      LEFT JOIN categories c ON c.id = p.categorie_id
      WHERE p.categorie_id = ?
      ORDER BY p.nom COLLATE NOCASE ASC, p.id ASC LIMIT ?
    `);

    stmtSearchFTS = db.prepare(`
      SELECT ${PRODUCT_COLUMNS}, c.nom AS categorie_nom FROM produits_fts f
      INNER JOIN produits p ON p.id = f.rowid
      LEFT JOIN categories c ON c.id = p.categorie_id
      WHERE produits_fts MATCH ?
      ORDER BY p.nom COLLATE NOCASE ASC, p.id ASC LIMIT ?
    `);

    stmtSearchLike = db.prepare(`
      SELECT ${PRODUCT_COLUMNS}, c.nom AS categorie_nom FROM produits p
      LEFT JOIN categories c ON c.id = p.categorie_id
      WHERE p.nom LIKE ? OR p.code LIKE ?
      ORDER BY p.nom COLLATE NOCASE ASC, p.id ASC LIMIT ?
    `);

    // ⭐ Esorina ny WHERE status != 'archive'
    // ⭐ VAOVAO: fanisana par type
    stmtGetStats = db.prepare(`
      SELECT COUNT(*) AS total,
        COALESCE(SUM(quantite_stock), 0) AS totalStock,
        COALESCE(SUM(CASE WHEN quantite_stock <= 0 THEN 1 ELSE 0 END), 0) AS rupture,
        COALESCE(SUM(CASE WHEN quantite_stock > 0 AND quantite_stock <= quantite_minimale THEN 1 ELSE 0 END), 0) AS alerte,
        COALESCE(SUM(prix_vente * quantite_stock), 0) AS valeur_totale,
        COALESCE(SUM(CASE WHEN type_produit = 'fini' THEN 1 ELSE 0 END), 0) AS total_fini,
        COALESCE(SUM(CASE WHEN type_produit = 'matiere_premiere' THEN 1 ELSE 0 END), 0) AS total_matiere,
        COALESCE(SUM(CASE WHEN type_produit = 'fourniture' THEN 1 ELSE 0 END), 0) AS total_fourniture
      FROM produits
    `);

    stmtCheckUsage = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM details_commandes WHERE produit_id = ?) AS commandes,
        (SELECT COUNT(*) FROM mouvements_stock WHERE produit_id = ?) AS mouvements,
        (SELECT COUNT(*) FROM entrees_stock WHERE produit_id = ?) AS entrees,
        (SELECT COUNT(*) FROM sorties_stock WHERE produit_id = ?) AS sorties
    `);

    stmtPrepared = true;
    if (DEBUG) log('✅ [products:statements] All prepared statements ready');
    return true;
  } catch (err) {
    error('❌ [products:statements] Erreur preparation:', err.message);
    return false;
  }
}

module.exports = {
  prepareStatements,
  ensureTypeProduitColumn,
  get stmtGetById() { return stmtGetById; },
  get stmtGetByCode() { return stmtGetByCode; },
  get stmtCreate() { return stmtCreate; },
  get stmtUpdate() { return stmtUpdate; },
  get stmtDelete() { return stmtDelete; },
  get stmtUpdateStock() { return stmtUpdateStock; },
  get stmtGetAlertes() { return stmtGetAlertes; },
  get stmtGetTop() { return stmtGetTop; },
  get stmtGetByCategorie() { return stmtGetByCategorie; },
  get stmtSearchFTS() { return stmtSearchFTS; },
  get stmtSearchLike() { return stmtSearchLike; },
  get stmtGetStats() { return stmtGetStats; },
  get stmtCheckUsage() { return stmtCheckUsage; },
};