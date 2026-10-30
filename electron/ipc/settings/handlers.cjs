// ============================================================
// electron/ipc/settings/handlers.cjs - Settings handlers
// ⭐ FIX: Mamerina `true` mba tsy hiteraka ilay "function returned false"
// ============================================================
'use strict';

const { getDb } = require('../../database/connection.cjs');

function withDbCheck(fn) {
  return (event, ...args) => {
    const db = getDb();
    if (!db || !db.open) {
      return { success: false, error: 'Database connection is not open' };
    }
    return fn(db, event, ...args);
  };
}

function registerSettingsHandlers(ipcMain) {
  if (!ipcMain) return false;

  const channels = ['settings:get-all','settings:get-by-id','settings:get-by-key','settings:set','settings:update','settings:delete','settings:reset'];
  for (const ch of channels) try { ipcMain.removeHandler(ch); } catch (_) {}

  ipcMain.handle('settings:get-all', withDbCheck((db) => {
    try {
      const stmt = db.prepare('SELECT * FROM settings ORDER BY key ASC');
      return { success: true, data: stmt.all() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle('settings:get-by-id', withDbCheck((db, event, id) => {
    try {
      const stmt = db.prepare('SELECT * FROM settings WHERE id = ?');
      return { success: true, data: stmt.get(id) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle('settings:get-by-key', withDbCheck((db, event, key) => {
    try {
      const stmt = db.prepare('SELECT * FROM settings WHERE key = ?');
      return { success: true, data: stmt.get(key) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle('settings:set', withDbCheck((db, event, key, value) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(key, value);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle('settings:update', withDbCheck((db, event, id, data) => {
    try {
      const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(data.value, id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle('settings:delete', withDbCheck((db, event, id) => {
    try {
      const stmt = db.prepare('DELETE FROM settings WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }));

  ipcMain.handle('settings:reset', withDbCheck((db) => {
    try {
      db.exec('DELETE FROM settings');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }));

  console.log('✅ Settings handlers enregistrés');
  return true; // ⭐ FIX: Mamerina true
}

module.exports = { registerSettingsHandlers };