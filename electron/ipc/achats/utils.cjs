// electron/ipc/achats/utils.cjs
const { BrowserWindow } = require('electron');

const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log(...args);
}

function error(...args) {
  console.error(...args);
}

function emitAchatsChanged(data) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) return;
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send('achats:changed', data);
        if (DEBUG) log(`📤 Event achats:changed émis: ${data.type} - ${data.id || 'N/A'}`);
      } catch (err) {
        error('❌ [achats.utils] Erreur émission:', err.message);
      }
    }
  });
}

module.exports = { DEBUG, log, error, emitAchatsChanged };