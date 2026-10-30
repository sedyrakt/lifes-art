// ============================================================
// electron/ipc/auth/logger.cjs
// ============================================================
'use strict';

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log(...args);
}

function error(...args) {
  console.error(...args);
}

module.exports = { log, error };