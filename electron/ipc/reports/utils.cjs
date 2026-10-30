// ============================================================
// electron/ipc/reports/utils.cjs - HELPERS & CONSTANTES (10/10)
// ⭐ FANITSARA: Fix getPrixAchatColumn fallback, export clearStatementCache
// ============================================================

const { getDb } = require('../../database/connection.cjs');
const { BrowserWindow } = require('electron');
const { log } = require('./logger.cjs');

// ============================================================
// ⭐ CONSTANTES & HELPERS
// ============================================================
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatMonth(m) {
  return MONTHS[parseInt(m) - 1] || m;
}

function validateYear(y) {
  const year = Number(y);
  if (isNaN(year) || year < 2000 || year > 2100) return new Date().getFullYear();
  return year;
}

function validateLimit(limit, def = 10, max = 100) {
  return Math.max(1, Math.min(Number(limit) || def, max));
}

// ============================================================
// ⭐ HELPERS HO AN'NY FANAMARINANA KOLONA
// ============================================================
function getTableColumns(db, tableName) {
  try {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
    const columns = stmt.all();
    return new Set(columns.map(c => c.name));
  } catch (e) {
    return new Set();
  }
}

function columnExists(db, tableName, columnName) {
  const columns = getTableColumns(db, tableName);
  return columns.has(columnName);
}

// ============================================================
// ⭐ FANITSIANA: getColumnValue (ho an'ny prix_achat dynamique)
// ============================================================
function getPrixAchatColumn(db) {
  const hasPrixAchat = columnExists(db, 'produits', 'prix_achat');
  // ⭐ FANITSARA 7: Raha tsy misy prix_achat dia 0 ny fallback, fa tsy p.prix_vente
  return hasPrixAchat ? 'p.prix_achat' : '0';
}

function getPrixAchatColumnForProduits(db) {
  const hasPrixAchat = columnExists(db, 'produits', 'prix_achat');
  return hasPrixAchat ? 'prix_achat' : '0';
}

// ============================================================
// ⭐ EMIT REPORTS CHANGED
// ============================================================
function emitReportsChanged(data) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) return;
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      try { win.webContents.send('reports:changed', data); } catch (_) {}
    }
  });
  log(`📤 reports:changed - ${data.type || 'refresh'}`);
}

// ============================================================
// ⭐ AUDIT LOG
// ============================================================
function logAudit(action, reportType, userId, details = '') {
  try {
    const db = getDb();
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at)
      VALUES (?, 'report', 0, ?, ?, ?, datetime('now'))
    `);
    stmt.run(action, reportType, userId, details);
  } catch (_) {}
}

module.exports = {
  MONTHS,
  formatMonth,
  validateYear,
  validateLimit,
  getTableColumns,
  columnExists,
  getPrixAchatColumn,
  getPrixAchatColumnForProduits,
  emitReportsChanged,
  logAudit,
};