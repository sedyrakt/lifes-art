// electron/ipc/employes/logger.cjs
// ============================================================
// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
// ============================================================

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[👷 employes]', ...args);
}

function error(...args) {
  console.error('[❌ employes]', ...args);
}

module.exports = { log, error, DEBUG };