// ============================================================
// database/queries.cjs - QUERIES (CommonJS)
// ⭐ FANITSARA: Nesoriko ny dbPath sy updateDatabaseIntegrity (foana)
// ⭐ FANITSARA: Mampiasa normalizeRow sy normalizeRows
// ============================================================

const { MAX_BUSY_RETRIES, RETRY_DELAY_MS, isPackaged, ALLOWED_TABLES } = require('./config.cjs');
const { log, warn, error, sleep, normalizeParam, normalizeRow, normalizeRows, isSqlSafe } = require('./utils.cjs');
const { getDb } = require('./connection.cjs');

// ============================================================
// ⭐ SAFE RUN - AVEC RETRY DELAY
// ============================================================
const safeRun = (fn, context = '') => {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_BUSY_RETRIES; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      if (err.code !== 'SQLITE_BUSY') throw err;
      warn(`⚠️ SQLITE_BUSY ${context}, tentative ${attempt}/${MAX_BUSY_RETRIES}`);
      if (attempt < MAX_BUSY_RETRIES) {
        const start = Date.now();
        while (Date.now() - start < RETRY_DELAY_MS) {}
      }
    }
  }
  throw lastError || new Error(`Échec après ${MAX_BUSY_RETRIES} tentatives`);
};

// ============================================================
// ⭐ RUN QUERY
// ============================================================
const runQuery = (query, params = []) => {
  return safeRun(() => {
    const currentDb = getDb();
    const stmt = currentDb.prepare(query);
    const normalizedParams = params.map((value, index) => normalizeParam(value, index));
    const result = stmt.run(...normalizedParams);
    // Nesoriko ny updateDatabaseIntegrity satria tsy ilaina
    return { lastID: result.lastInsertRowid, changes: result.changes };
  }, `runQuery: ${query.substring(0, 50)}`);
};

// ============================================================
// ⭐ GET ALL ROWS (miaraka amin'ny normalization)
// ============================================================
const getAllRows = (query, params = []) => {
  return safeRun(() => {
    const currentDb = getDb();
    const stmt = currentDb.prepare(query);
    const normalizedParams = params.map((value, index) => normalizeParam(value, index));
    const rows = stmt.all(...normalizedParams);
    return normalizeRows(rows);
  }, `getAllRows: ${query.substring(0, 50)}`);
};

// ============================================================
// ⭐ GET ONE ROW (miaraka amin'ny normalization)
// ============================================================
const getOneRow = (query, params = []) => {
  return safeRun(() => {
    const currentDb = getDb();
    const stmt = currentDb.prepare(query);
    const normalizedParams = params.map((value, index) => normalizeParam(value, index));
    const row = stmt.get(...normalizedParams);
    return normalizeRow(row);
  }, `getOneRow: ${query.substring(0, 50)}`);
};

// ============================================================
// ⭐ ASYNC VERSIONS
// ============================================================
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try { resolve(getAllRows(sql, params)); } catch (err) { reject(err); }
  });
};

const runAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try { resolve(runQuery(sql, params)); } catch (err) { reject(err); }
  });
};

const getOneAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try { resolve(getOneRow(sql, params)); } catch (err) { reject(err); }
  });
};

// ============================================================
// ⭐ TRANSACTION
// ============================================================
const transaction = (fn) => {
  const currentDb = getDb();
  const transactionFn = currentDb.transaction(fn);
  return transactionFn();
};

// ============================================================
// ⭐ REGISTER DB QUERY HANDLER (IPC)
// ============================================================
function registerDbQueryHandler(ipcMain) {
  // ⭐ Ampiasao ny isPackaged avy amin'ny config
  ipcMain.handle('db:query', async (event, sql, params) => {
    if (isPackaged && !isSqlSafe(sql)) {
      throw new Error('Requête SQL non autorisée');
    }
    return await getAllRows(sql, params);
  });
}

// ============================================================
// ⭐ VALIDATE TABLE
// ============================================================
const validateTable = (table) => {
  if (!ALLOWED_TABLES.has(table)) throw new Error(`Table non autorisée: ${table}`);
  return table;
};

// ============================================================
// ⭐ EXPORTS
// ============================================================
module.exports = {
  safeRun,
  runQuery,
  getAllRows,
  getOneRow,
  queryAsync,
  runAsync,
  getOneAsync,
  transaction,
  registerDbQueryHandler,
  validateTable,
};