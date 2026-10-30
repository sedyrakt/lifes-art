// ============================================================
// electron/ipc/fournisseurs/logger.cjs - LOGGING
// ============================================================

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[🏭 fournisseurs]', ...args);
}

function error(...args) {
  console.error('[❌ fournisseurs]', ...args);
}

module.exports = { log, error, DEBUG };