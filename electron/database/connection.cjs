'use strict';
// ============================================================
// electron/database/connection.cjs
// LIFE'S ART ERP — SQLite Connection Manager
// ⭐ FIX: getDb() manamarina raha mikatona ny instance
// ⭐ FIX: closeDatabase() manadio tsara ny instance
// ⭐ VAOVAO: forceReconnect() ho an'ny backup/restore
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { log, warn, error, getEncryptionKey } = require('./utils.cjs');

let dbInstance = null;

// ============================================================
// ⭐ GET DB PATH
// ============================================================
function getDbPath() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'lifesart.db');

  console.log('============================================================');
  console.log('📦 LIFESART DATABASE DEBUG');
  console.log('============================================================');
  console.log('📁 app.getPath("userData") :', userDataPath);
  console.log('📁 Database path            :', dbPath);
  console.log('📊 Database exists          :', fs.existsSync(dbPath));
  console.log('============================================================');

  return dbPath;
}

// ============================================================
// ⭐ CREATE CONNECTION
// ============================================================
function createConnection() {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      log(`📁 Dossier DB créé: ${dbDir}`);
    } catch (mkdirErr) {
      error(`❌ [connection] Impossible de créer '${dbDir}':`, mkdirErr.message);
      return null;
    }
  }

  let encryptionKey = null;
  try {
    encryptionKey = getEncryptionKey();
  } catch (keyErr) {
    warn('⚠️ Impossible récupérer encryption key:', keyErr.message);
  }

  try {
    const options = encryptionKey ? { key: encryptionKey } : {};
    const newDb = new Database(dbPath, options);

    try { newDb.pragma('journal_mode = WAL'); } catch (pragmaErr) { warn('⚠️ journal_mode pragma:', pragmaErr.message); }
    try { newDb.pragma('busy_timeout = 30000'); } catch (pragmaErr) { warn('⚠️ busy_timeout pragma:', pragmaErr.message); }
    try { newDb.pragma('optimize'); } catch (pragmaErr) { warn('⚠️ optimize pragma:', pragmaErr.message); }

    // ⭐ Test connexion
    const connectionTest = newDb.prepare('SELECT 1 AS ok').get();
    if (!connectionTest || Number(connectionTest.ok) !== 1) {
      throw new Error('SQLite connection test failed');
    }

    console.log('============================================================');
    console.log('✅ SQLITE DATABASE CONNECTED');
    console.log('============================================================');
    console.log('📁 Path       :', dbPath);
    console.log('📦 Size       :', fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0, 'bytes');
    console.log('🔐 Encrypted  :', encryptionKey ? 'YES' : 'NO');
    console.log('🟢 Open       :', newDb.open);
    console.log('============================================================');

    return newDb;
  } catch (err) {
    error(`❌ [connection] Erreur ouverture DB:`, err.message);
    return null;
  }
}

// ============================================================
// ⭐ GET DB — Singleton
// ============================================================
function getDb() {
  // ⭐ FIX LEHIBE: Raha misy objet nefa mikatona (db.open == false), dia fafana aloha!
  if (dbInstance && !dbInstance.open) {
    dbInstance = null;
  }

  // ⭐ Rehefa null na mikatona, dia mamorona vaovao
  if (!dbInstance) {
    dbInstance = createConnection();
  }

  return dbInstance;
}

// ============================================================
// ⭐ CLOSE DATABASE
// ============================================================
function closeDatabase() {
  try {
    if (dbInstance) {
      if (dbInstance.open) {
        // ⭐ Checkpoint WAL alohan'ny close mba ho azo antoka ny data
        try { dbInstance.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
        dbInstance.close();
      }
      dbInstance = null; // ⭐ Zava-dehibe: Atombohy ho null!
    }
  } catch (err) {
    warn('⚠️ [connection] Erreur fermeture:', err.message);
    dbInstance = null;
  }
}

// ============================================================
// ⭐ VAOVAO: FORCE RECONNECT
// ⭐ Ampiasaina rehefa avy restore na backup lehibe
// ⭐ Manery connection vaovao manontolo (checkpoint + close + open)
// ============================================================
function forceReconnect() {
  log('🔄 [connection] Force reconnect...');
  try {
    if (dbInstance && dbInstance.open) {
      try { dbInstance.pragma('wal_checkpoint(TRUNCATE)'); } catch (walErr) {
        warn('⚠️ [connection] checkpoint before reconnect:', walErr.message);
      }
      dbInstance.close();
      log('🛑 [connection] Ancienne connexion fermée');
    }
  } catch (err) {
    warn('⚠️ [connection] forceReconnect close:', err.message);
  } finally {
    dbInstance = null;
  }

  const newDb = getDb();
  if (newDb && newDb.open) {
    log('✅ [connection] Nouvelle connexion établie');
  } else {
    error('❌ [connection] Échec forceReconnect');
  }
  return newDb;
}

// ============================================================
// ⭐ VAOVAO: GET DB DEBUG INFO
// ⭐ Ampiasaina amin'ny IPC 'db:debug'
// ============================================================
function getDatabaseDebugInfo() {
  try {
    const dbPath = getDbPath();
    const db = getDb();
    const info = {
      success: true,
      path: dbPath,
      exists: fs.existsSync(dbPath),
      size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
      open: db ? !!db.open : false,
      timestamp: new Date().toISOString(),
    };
    if (db && db.open) {
      try {
        info.journalMode = db.pragma('journal_mode', { simple: true });
        info.busyTimeout = db.pragma('busy_timeout', { simple: true });
        info.tables = db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
        ).all().map(r => r.name);
        info.tableCount = info.tables.length;
      } catch (pragmaErr) {
        info.debugError = pragmaErr.message;
      }
    }
    return info;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// ⭐ EXPORTS
// ============================================================
module.exports = {
  getDb,
  getDbPath,
  closeDatabase,
  forceReconnect,
  getDatabaseDebugInfo,
};