// ============================================================
// electron/ipc/expenses/statements.cjs
// ⭐ FIX: Re-cache automatique rehefa vaovao ny db instance
// ⭐ NOUVEAU: getStmtGetStatsWithDates + getStmtGetTopCategoriesWithDates
// ⭐ FIX CRITIQUE: substr(date_depense, 1, 10) ho an'ny BETWEEN
//   (ny date_depense dia mety "2026-10-01" na "2026-10-01 00:00:00" — 
//    tsy mifanaraka amin'ny BETWEEN 'YYYY-MM-DD HH:MM:SS' ny date-only)
// ============================================================
'use strict';

const { getDb } = require('../../database/connection.cjs');
const { error } = require('../../database/utils.cjs');

// ⭐ Cache statements — hofafana rehefa vaovao ny db instance
const statementCache = new Map();

// ⭐ Track ny db instance izay nanaovana cache
let lastPreparedDb = null;

function getStatement(db, sql) {
  // ⭐ FIX: Raha vaovao ny db, fafao ny cache
  if (lastPreparedDb !== db) {
    if (statementCache.size > 0) {
      console.log('🔄 [expenses:statements] DB instance a changé, cache vidé');
      statementCache.clear();
    }
    lastPreparedDb = db;
  }

  if (!statementCache.has(sql)) {
    statementCache.set(sql, db.prepare(sql));
  }
  return statementCache.get(sql);
}

function getTableColumns(db, tableName) {
  try {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
    return new Set(stmt.all().map(c => c.name));
  } catch (_) { return new Set(); }
}

function addColumnIfNotExists(db, tableName, columnDef) {
  const colName = columnDef.split(' ')[0];
  const cols = getTableColumns(db, tableName);
  if (!cols.has(colName)) {
    try {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`);
      return true;
    } catch (err) {
      error(`❌ Erreur migration ${tableName}.${colName}:`, err.message);
      return false;
    }
  }
  return false;
}

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS depenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categorie TEXT NOT NULL,
      description TEXT,
      montant REAL NOT NULL,
      date_depense TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  addColumnIfNotExists(db, 'depenses', 'mode_paiement TEXT DEFAULT "Espèces"');
  addColumnIfNotExists(db, 'depenses', 'reference TEXT');
  addColumnIfNotExists(db, 'depenses', 'observation TEXT');
  addColumnIfNotExists(db, 'depenses', 'fournisseur_id INTEGER');
  addColumnIfNotExists(db, 'depenses', 'fournisseur_nom TEXT');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_depenses_date ON depenses(date_depense)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_depenses_categorie ON depenses(categorie)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_depenses_mode ON depenses(mode_paiement)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_depenses_fournisseur ON depenses(fournisseur_id)`);
}

function prepareStatements() {
  const db = getDb();
  if (!db || !db.open) {
    error('❌ [expenses:statements] DB indisponible');
    lastPreparedDb = null;
    return false;
  }

  // ⭐ FIX: Raha mitovy ny db instance ary efa voaomana, skip
  if (lastPreparedDb === db && statementCache.size > 0) {
    return true;
  }

  try {
    // ⭐ FIX: Rehefa vaovao ny db, fafao ny cache aloha
    if (lastPreparedDb !== db) {
      statementCache.clear();
      lastPreparedDb = db;
    }

    ensureTables(db);

    // ⭐ Force prepare ny statements rehetra amin'ny db vaovao
    getStmtGetById(db);
    getStmtGetByPeriod(db);
    getStmtGetByCategory(db);
    getStmtGetByMode(db);
    getStmtGetSummaryWithDates(db);
    getStmtGetSummary(db);
    getStmtGetTopCategoriesWithDates(db);
    getStmtGetTopCategories(db);
    getStmtGetStats(db);
    getStmtGetStatsWithDates(db);
    getStmtDeleteById(db);
    getStmtGetByIdForBulk(db);

    return true;
  } catch (err) {
    error('❌ [expenses:statements] Erreur préparation:', err.message);
    statementCache.clear();
    lastPreparedDb = null;
    return false;
  }
}

function getStmtGetById(db) { return getStatement(db, 'SELECT * FROM depenses WHERE id = ?'); }

function getStmtGetByPeriod(db) {
  return getStatement(db, `
    SELECT * FROM depenses
    WHERE substr(date_depense, 1, 10) >= substr(?, 1, 10)
      AND substr(date_depense, 1, 10) <= substr(?, 1, 10)
    ORDER BY date_depense
  `);
}

function getStmtGetByCategory(db) {
  return getStatement(db, 'SELECT * FROM depenses WHERE categorie = ? ORDER BY date_depense DESC');
}

function getStmtGetByMode(db) {
  return getStatement(db, 'SELECT * FROM depenses WHERE mode_paiement = ? ORDER BY date_depense DESC');
}

// ⭐ FIX CRITIQUE: substr ho an'ny date-only vs datetime
function getStmtGetSummaryWithDates(db) {
  return getStatement(db, `
    SELECT COUNT(*) AS total_count, SUM(montant) AS total_amount, AVG(montant) AS average_amount,
           MAX(montant) AS max_amount, MIN(montant) AS min_amount, COUNT(DISTINCT categorie) AS categories_count
    FROM depenses
    WHERE substr(date_depense, 1, 10) >= substr(?, 1, 10)
      AND substr(date_depense, 1, 10) <= substr(?, 1, 10)
  `);
}

function getStmtGetSummary(db) {
  return getStatement(db, `
    SELECT COUNT(*) AS total_count, SUM(montant) AS total_amount, AVG(montant) AS average_amount,
           MAX(montant) AS max_amount, MIN(montant) AS min_amount, COUNT(DISTINCT categorie) AS categories_count
    FROM depenses
  `);
}

// ⭐ FIX CRITIQUE: substr ho an'ny date-only vs datetime
function getStmtGetTopCategoriesWithDates(db) {
  return getStatement(db, `
    SELECT categorie, COUNT(*) AS count, SUM(montant) AS total
    FROM depenses
    WHERE substr(date_depense, 1, 10) >= substr(?, 1, 10)
      AND substr(date_depense, 1, 10) <= substr(?, 1, 10)
    GROUP BY categorie ORDER BY total DESC LIMIT 5
  `);
}

function getStmtGetTopCategories(db) {
  return getStatement(db, `
    SELECT categorie, COUNT(*) AS count, SUM(montant) AS total
    FROM depenses GROUP BY categorie ORDER BY total DESC LIMIT 5
  `);
}

function getStmtGetStats(db) {
  return getStatement(db, `
    SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*) AS nb, COALESCE(AVG(montant), 0) AS moyenne,
           COALESCE(MAX(montant), 0) AS plusGrande, COALESCE(MIN(montant), 0) AS plusPetite,
           COUNT(DISTINCT fournisseur_id) AS nbFournisseurs,
           COALESCE(SUM(CASE WHEN strftime('%Y-%m', date_depense) = strftime('%Y-%m', 'now') THEN montant ELSE 0 END), 0) AS mois_en_cours,
           COALESCE(SUM(CASE WHEN strftime('%Y-%m', date_depense) = strftime('%Y-%m', 'now', '-1 month') THEN montant ELSE 0 END), 0) AS mois_dernier
    FROM depenses
  `);
}

function getStmtGetStatsWithDates(db) {
  return getStatement(db, `
    SELECT
      COALESCE(SUM(montant), 0) AS total,
      COUNT(*) AS nb,
      COALESCE(AVG(montant), 0) AS moyenne,
      COALESCE(MAX(montant), 0) AS plusGrande,
      COALESCE(MIN(montant), 0) AS plusPetite,
      COUNT(DISTINCT fournisseur_id) AS nbFournisseurs
    FROM depenses
    WHERE substr(date_depense, 1, 10) >= substr(?, 1, 10)
      AND substr(date_depense, 1, 10) <= substr(?, 1, 10)
  `);
}

function getStmtDeleteById(db) { return getStatement(db, 'DELETE FROM depenses WHERE id = ?'); }
function getStmtGetByIdForBulk(db) { return getStatement(db, 'SELECT id, categorie, montant FROM depenses WHERE id = ?'); }

function getStmtInsertExpense(db, fields, placeholders) {
  const sql = `INSERT INTO depenses (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
  return getStatement(db, sql);
}

function getStmtUpdateExpense(db, setFields) {
  const sql = `UPDATE depenses SET ${setFields.join(', ')} WHERE id = ?`;
  return getStatement(db, sql);
}

// ⭐ Clear cache (ho antsoina rehefa mila)
function clearCache() {
  statementCache.clear();
  lastPreparedDb = null;
}

module.exports = {
  prepareStatements,
  clearCache,
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
  getStatement,
};