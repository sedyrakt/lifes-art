// ============================================================
// electron/ipc/expenses/logger.cjs - LOGGING
// ============================================================

// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[💸 expenses]', ...args);
}

function error(...args) {
  console.error('[❌ expenses]', ...args);
}

module.exports = { log, error, DEBUG };