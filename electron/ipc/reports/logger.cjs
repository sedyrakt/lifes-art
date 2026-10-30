// ============================================================
// electron/ipc/reports/logger.cjs - LOGGING
// ============================================================

// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[📊 reports]', ...args);
}

function error(...args) {
  console.error('[❌ reports]', ...args);
}

module.exports = { log, error, DEBUG };