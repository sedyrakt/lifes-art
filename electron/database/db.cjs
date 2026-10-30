// ============================================================
// database/db.cjs - ENTRY POINT (CommonJS)
// ⭐ Re-export avy amin'ny index.cjs
// ⭐ FANITSARA: Ampio explicit ny hashPassword sy normalize
// ⭐ FANITSARA VAOVAO: Nampiana normalizeRow sy normalizeRows
// ============================================================

const dbModule = require('./index.cjs');

// ⭐ FANITSARA VAOVAO: Fonction normalizeRow
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      normalized[key] = value.toISOString();
    } else if (value === undefined) {
      normalized[key] = null;
    } else if (value !== null && typeof value === 'object' && !Buffer.isBuffer(value)) {
      try {
        normalized[key] = JSON.stringify(value);
      } catch (_) {
        normalized[key] = null;
      }
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

function normalizeRows(rows) {
  if (!rows) return rows;
  if (Array.isArray(rows)) {
    return rows.map(row => normalizeRow(row));
  }
  return normalizeRow(rows);
}

// ⭐ Re-export rehetra
module.exports = {
  ...dbModule,
  // ⭐ Explicit re-export ho an'ny hashPassword
  hashPassword: dbModule.hashPassword || require('./utils.cjs').hashPassword,
  hashPasswordSync: dbModule.hashPasswordSync || require('./utils.cjs').hashPasswordSync,
  verifyPassword: dbModule.verifyPassword || require('./utils.cjs').verifyPassword,
  verifyPasswordSync: dbModule.verifyPasswordSync || require('./utils.cjs').verifyPasswordSync,
  // ⭐ FANITSARA VAOVAO: Re-export normalizeRow sy normalizeRows
  normalizeRow: dbModule.normalizeRow || normalizeRow,
  normalizeRows: dbModule.normalizeRows || normalizeRows,
};

console.log('✅ db.cjs - Chargé avec hashPassword et normalizeRow');