// ============================================================
// electron/ipc/auth/utils.cjs
// ============================================================
'use strict';

const { BrowserWindow } = require('electron');
const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log(...args);
}

function error(...args) {
  console.error(...args);
}

function emitAuthChanged(data) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) return;
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send('auth:changed', data);
        if (DEBUG) log(`📤 Event auth:changed émis: ${data.type}`);
      } catch (err) {
        error('❌ [auth.utils] Erreur émission:', err.message);
      }
    }
  });
}

module.exports = { DEBUG, log, error, emitAuthChanged };