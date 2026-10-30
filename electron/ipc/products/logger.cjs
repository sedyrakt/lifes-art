// ============================================================
// electron/ipc/products/logger.cjs - LOGGING
// ============================================================

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log('[📦 products]', ...args);
}

function error(...args) {
  console.error('[❌ products]', ...args);
}

module.exports = { log, error, DEBUG };