// electron/ipc/settings.cjs
const path = require('path');
const fs = require('fs');
const os = require('os');

const SETTINGS_PATH = path.join(os.homedir(), '.gestionstock', 'settings.json');

const getSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('❌ Erreur lecture settings:', error);
    return {};
  }
};

const saveSettings = (settings) => {
  try {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde settings:', error);
    return false;
  }
};

const registerSettingsHandlers = (ipcMain) => {

  // ==================== GET ALL SETTINGS ====================
  ipcMain.handle('settings:get-all', async () => {
    try {
      return { success: true, data: getSettings() };
    } catch (error) {
      console.error('❌ Erreur settings:get-all:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== GET SETTING ====================
  ipcMain.handle('settings:get', async (event, key) => {
    try {
      const settings = getSettings();
      return { success: true, data: settings[key] };
    } catch (error) {
      console.error('❌ Erreur settings:get:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== SET SETTING ====================
  ipcMain.handle('settings:set', async (event, key, value) => {
    try {
      const settings = getSettings();
      settings[key] = value;
      saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur settings:set:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== DELETE SETTING ====================
  ipcMain.handle('settings:delete', async (event, key) => {
    try {
      const settings = getSettings();
      delete settings[key];
      saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur settings:delete:', error);
      return { success: false, error: error.message };
    }
  });

  return true; // ⭐ FIX: Mamerina true
};

module.exports = { registerSettingsHandlers };