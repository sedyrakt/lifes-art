// ============================================================
// electron/ipc/db.cjs - HANDLERS POUR LES REQUETES DB (CORRIGÉ)
// ⭐ FANITSARA: Solon'ny getAllRows, mampiasa db.prepare() mivantana
// ⭐ FANITSARA: Nampiana db null checks sy DEBUG logs
// ⭐ FANITSARA: Nohavaozina ny db:status mba hijerena ny toetry ny DB
// ============================================================

const { getDb } = require('../database/connection.cjs');
const { log, error } = require('../database/utils.cjs');

// ============================================================
// REGISTER DB HANDLERS
// ============================================================
const registerDbHandlers = (ipcMain) => {
  log('📦 ==========================================');
  log('📦 [db.cjs] ENREGISTREMENT HANDLERS DB');
  log('📦 ==========================================');

  if (!ipcMain) {
    error('❌ [db.cjs] ipcMain est null/undefined!');
    return;
  }

  // Supprimer les anciens handlers (si présents)
  const channels = [
    'db:query', 'db:run', 'db:get-one',
    'db:query-sync', 'db:run-sync', 'db:get-one-sync',
    'db:status', 'db:exec', 'db:prepare', 'db:tables'
  ];
  for (const ch of channels) {
    try { ipcMain.removeHandler(ch); } catch (_) {}
  }

  // ============================================================
  // QUERY (async) - Mampiasa mivantana ny better-sqlite3
  // ============================================================
  ipcMain.handle('db:query', async (event, sql, params = []) => {
    log('📊 db:query:', sql.substring(0, 100) + '...');
    try {
      const db = getDb();
      if (!db) throw new Error('Service de base de données non disponible');
      
      const stmt = db.prepare(sql);
      const result = stmt.all(...params);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:query:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // RUN (async) - Mampiasa mivantana ny better-sqlite3
  // ============================================================
  ipcMain.handle('db:run', async (event, sql, params = []) => {
    log('📝 db:run:', sql.substring(0, 100) + '...');
    try {
      const db = getDb();
      if (!db) throw new Error('Service de base de données non disponible');
      
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:run:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // GET ONE (async) - Mampiasa mivantana ny better-sqlite3
  // ============================================================
  ipcMain.handle('db:get-one', async (event, sql, params = []) => {
    log('🔍 db:get-one:', sql.substring(0, 100) + '...');
    try {
      const db = getDb();
      if (!db) throw new Error('Service de base de données non disponible');
      
      const stmt = db.prepare(sql);
      const result = stmt.get(...params);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:get-one:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // QUERY SYNC (tsotra, tsy mila async)
  // ============================================================
  ipcMain.handle('db:query-sync', (event, sql, params = []) => {
    log('📊 db:query-sync:', sql.substring(0, 100) + '...');
    try {
      const db = getDb();
      if (!db) throw new Error('Service de base de données non disponible');
      
      const stmt = db.prepare(sql);
      const result = stmt.all(...params);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:query-sync:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // RUN SYNC (tsotra, tsy mila async)
  // ============================================================
  ipcMain.handle('db:run-sync', (event, sql, params = []) => {
    log('📝 db:run-sync:', sql.substring(0, 100) + '...');
    try {
      const db = getDb();
      if (!db) throw new Error('Service de base de données non disponible');
      
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:run-sync:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // GET ONE SYNC (tsotra, tsy mila async)
  // ============================================================
  ipcMain.handle('db:get-one-sync', (event, sql, params = []) => {
    log('🔍 db:get-one-sync:', sql.substring(0, 100) + '...');
    try {
      const db = getDb();
      if (!db) throw new Error('Service de base de données non disponible');
      
      const stmt = db.prepare(sql);
      const result = stmt.get(...params);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:get-one-sync:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // GET DB STATUS (NOHAVAOZINA)
  // ============================================================
  ipcMain.handle('db:status', () => {
    log('📊 db:status');
    try {
      const db = getDb();
      if (!db) throw new Error('La base de données n\'est pas connectée');
      
      const status = {
        open: db && db.open,
        path: db ? db.name : null,
        memoryUsed: db ? db.pragma('memory_used', { simple: true }) : null,
        pageSize: db ? db.pragma('page_size', { simple: true }) : null,
        pageCount: db ? db.pragma('page_count', { simple: true }) : null,
        journalMode: db ? db.pragma('journal_mode', { simple: true }) : null,
        synchronous: db ? db.pragma('synchronous', { simple: true }) : null,
        cacheSize: db ? db.pragma('cache_size', { simple: true }) : null,
      };
      return { success: true, data: status };
    } catch (error) {
      error('❌ Erreur db:status:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // EXEC (pour VACUUM, etc.)
  // ============================================================
  ipcMain.handle('db:exec', (event, sql) => {
    log('⚡ db:exec:', sql);
    try {
      const db = getDb();
      if (!db) throw new Error('La base de données n\'est pas connectée');
      
      const result = db.exec(sql);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:exec:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // PREPARE STATEMENT (Mampandeha mivantana)
  // ============================================================
  ipcMain.handle('db:prepare', (event, sql, params = []) => {
    log('📝 db:prepare:', sql.substring(0, 100) + '...');
    try {
      const db = getDb();
      if (!db) throw new Error('La base de données n\'est pas connectée');
      
      const stmt = db.prepare(sql);
      const result = stmt.all(...params);
      return { success: true, data: result };
    } catch (error) {
      error('❌ Erreur db:prepare:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // GET TABLES (SQLite Master)
  // ============================================================
  ipcMain.handle('db:tables', () => {
    log('📊 db:tables');
    try {
      const db = getDb();
      if (!db) throw new Error('La base de données n\'est pas connectée');
      
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      ).all();
      return { success: true, data: tables };
    } catch (error) {
      error('❌ Erreur db:tables:', error.message);
      return { success: false, error: error.message };
    }
  });

  // ============================================================
  // VÉRIFICATION FINALE
  // ============================================================
  const registeredEvents = ipcMain.eventNames();
  log('📋 [db.cjs] Vérification handlers:');
  let allRegistered = true;
  for (const ch of channels) {
    const isRegistered = registeredEvents.includes(ch);
    log(`   - ${ch}: ${isRegistered ? '✅' : '❌'}`);
    if (!isRegistered) allRegistered = false;
  }
  if (allRegistered) {
    log('✅ Tous les handlers db sont enregistrés avec succès');
  } else {
    error('⚠️ Certains handlers db ne sont pas enregistrés!');
    error('   Vérifiez les logs ci-dessus pour voir les erreurs');
  }
  log('📦 ==========================================');
  log('📦 [db.cjs] FIN ENREGISTREMENT');
  log('📦 ==========================================');
};

module.exports = { registerDbHandlers };