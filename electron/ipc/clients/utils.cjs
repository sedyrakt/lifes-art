// ============================================================
// electron/ipc/clients/utils.cjs - UTILS (10/10)
// ⭐ FANITSARA: Esorina ny getMainWindow tsy ampiasaina, emitClientsChanged Windows rehetra
// ============================================================

const { BrowserWindow } = require('electron');

// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
const DEBUG = false;

function log(...args) {
  if (DEBUG) console.log(...args);
}

function error(...args) {
  console.error(...args);
}

// ⭐ FANITSARA 3: emitClientsChanged ho an'ny Windows rehetra
function emitClientsChanged(data) {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) return;
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send('clients:changed', data);
        log(`📤 Event clients:changed émis: ${data.type} - ${data.id || 'N/A'}`);
      } catch (err) {
        error('❌ [clients.utils] Erreur émission:', err.message);
      }
    }
  });
}

module.exports = { DEBUG, log, error, emitClientsChanged };