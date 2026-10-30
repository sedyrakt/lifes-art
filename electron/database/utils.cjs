// ============================================================
// database/utils.cjs - UTILS (CommonJS)
// ⭐ FANITSARA: getEncryptionKey mamerina null foana (tsy mampiasa AES_KEY)
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
const DEBUG = false;

// ============================================================
// ⭐ LOGGING
// ============================================================
function log(...args) { if (DEBUG) console.log('[DB]', ...args); }
function warn(...args) { console.warn('[DB]', ...args); }
function error(...args) { console.error('[DB]', ...args); }

// ============================================================
// ⭐ SLEEP
// ============================================================
function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {}
}

// ============================================================
// ⭐ ENCRYPTION KEY - TSY MAMPISA INTOSONY
// ============================================================
function getEncryptionKey() {
  // ⚠️ VONJIMAIKA: Mamerina null foana mba tsy hampiasa encryption
  return null;
}

// ============================================================
// ⭐ NORMALIZE PARAM
// ============================================================
function normalizeParam(value, index) {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
    try {
      return JSON.stringify(value);
    } catch (_) {
      return String(value);
    }
  }
  return value;
}

// ============================================================
// ⭐ NORMALIZE ROW
// ============================================================
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

// ============================================================
// ⭐ SQL SAFE CHECK
// ============================================================
function isSqlSafe(sql) {
  const forbidden = [
    'DROP', 'ALTER', 'DELETE', 'UPDATE', 'INSERT',
    'TRUNCATE', 'CREATE', 'REPLACE', 'RENAME',
    'ATTACH', 'DETACH', 'REINDEX', 'VACUUM'
  ];
  const upper = sql.toUpperCase();
  for (const word of forbidden) {
    if (upper.includes(word)) return false;
  }
  return true;
}

// ============================================================
// ⭐ PERMISSIONS
// ============================================================
function setDatabasePermissions(dbPath) {
  try {
    if (fs.existsSync(dbPath)) {
      fs.chmodSync(dbPath, 0o600);
      log('✅ Permissions définies (rw-------)');
    }
  } catch (err) {
    warn('⚠️ Erreur setDatabasePermissions:', err.message);
  }
}

// ============================================================
// ⭐ INTEGRITY
// ============================================================
function verifyDatabaseIntegrity(dbPath) {
  try {
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      log(`📁 Fichier DB: ${stat.size} octets`);
    }
  } catch (err) {
    warn('⚠️ Erreur verifyDatabaseIntegrity:', err.message);
  }
}

function updateDatabaseIntegrity(dbPath) {
  // Fanaovana fotsiny, fa tsy ilaina amin'izao fotoana izao
}

// ============================================================
// ⭐ FOLDERS
// ============================================================
function createFolders() {
  try {
    const uploadDir = path.join(app.getPath('userData'), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      log('✅ Dossier uploads créé');
    }
  } catch (err) {
    warn('⚠️ Erreur createFolders:', err.message);
  }
}

// ============================================================
// ⭐ HASH PASSWORD (SYNC) – with fallback
// ============================================================
let bcrypt = null;
try {
  bcrypt = require('bcrypt');
} catch (_) {
  warn('⚠️ bcrypt non installé, les fonctions de hachage ne fonctionneront pas');
}

// ⭐ FANITSARA: Hardcoded ny SALT_ROUNDS mba tsy hiankina amin'ny process.env
const SALT_ROUNDS = 12;

function hashPassword(password) {
  if (!bcrypt) {
    error('❌ bcrypt non disponible');
    return null;
  }
  try {
    return bcrypt.hashSync(password, SALT_ROUNDS);
  } catch (err) {
    error('❌ Erreur hashPassword:', err.message);
    return null;
  }
}

function verifyPassword(password, hashed) {
  if (!bcrypt) {
    error('❌ bcrypt non disponible');
    return false;
  }
  try {
    return bcrypt.compareSync(password, hashed);
  } catch (err) {
    error('❌ Erreur verifyPassword:', err.message);
    return false;
  }
}

// ============================================================
// ⭐ EXPORTS
// ============================================================
module.exports = {
  log,
  warn,
  error,
  sleep,
  getEncryptionKey,
  normalizeParam,
  normalizeRow,
  normalizeRows,
  isSqlSafe,
  setDatabasePermissions,
  verifyDatabaseIntegrity,
  updateDatabaseIntegrity,
  createFolders,
  hashPassword,
  verifyPassword,
  hashPasswordSync: hashPassword,
  verifyPasswordSync: verifyPassword,
};