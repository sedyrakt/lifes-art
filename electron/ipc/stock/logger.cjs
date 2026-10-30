// ============================================================
// electron/ipc/stock/logger.cjs
// ============================================================

// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
const DEBUG = false;

function log(...args) { if (DEBUG) console.log('[📦 stock]', ...args); }
function error(...args) { console.error('[❌ stock]', ...args); }

module.exports = { log, error, DEBUG };