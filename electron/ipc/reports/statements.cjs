// ============================================================
// electron/ipc/reports/statements.cjs
// ============================================================
// ⭐ VERSION FINAL
// ⭐ Reports utilise LIVE DB handlers
// ⭐ Tsy mitahiry better-sqlite3 statement amin'ny cache
// ============================================================

'use strict';

const { getDb } = require('../../database/connection.cjs');
const { log, error } = require('../../database/utils.cjs');

let statementsReady = false;

function prepareStatements() {
  try {
    const db = getDb();

    if (!db || !db.open) {
      statementsReady = false;
      error('❌ [reports:statements] DB indisponible');
      return false;
    }

    statementsReady = true;
    log('✅ [reports:statements] Reports utilise LIVE DB');
    return true;
  } catch (err) {
    statementsReady = false;
    error('❌ [reports:statements]', err.message);
    return false;
  }
}

module.exports = {
  prepareStatements,
  get statementsReady() {
    return statementsReady;
  },
};