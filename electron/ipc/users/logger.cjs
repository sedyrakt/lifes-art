// ============================================================
// electron/ipc/users/logger.cjs - LOGGING
// ============================================================

const DEBUG = false; // ⭐ Production safe: tsy miankina amin'ny process.env.NODE_ENV intsony

function log(...args) {
  if (DEBUG) console.log('[👥 users]', ...args);
}

function error(...args) {
  console.error('[❌ users]', ...args);
}

module.exports = { log, error, DEBUG };