// electron/ipc/navigation.cjs
const { shell } = require('electron');

let mainWindow = null;
let isDev = false;
let appBaseDir = null;

const initNavigation = (window, dev, baseDir) => {
  mainWindow = window;
  isDev = dev;
  appBaseDir = baseDir;
  console.log('✅ Navigation initialisée');
};

const registerNavigationHandlers = (ipcMain) => {

  // ==================== NAVIGATE TO ====================
  ipcMain.handle('navigation:navigate-to', async (event, pathParam) => {
    try {
      if (!mainWindow) {
        console.error('❌ mainWindow non disponible');
        return { success: false, message: 'Fenêtre non disponible' };
      }
      
      console.log('🧭 Navigation vers:', pathParam);
      
      // ⭐⭐ NE PAS UTILISER loadURL() - Laisser React Router gérer ⭐⭐
      
      // ⭐ Si c'est une URL externe, ouvrir dans le navigateur
      if (pathParam.startsWith('http://') || pathParam.startsWith('https://')) {
        if (!pathParam.includes('localhost:5173')) {
          await shell.openExternal(pathParam);
          return { success: true };
        }
      }
      
      // ⭐ Navigation interne → envoyer au renderer
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('navigate', pathParam);
        mainWindow.focus();
        console.log('✅ Événement navigate envoyé au renderer');
        return { success: true, path: pathParam };
      }
      
      return { success: false, message: 'Impossible de naviguer' };
    } catch (error) {
      console.error('❌ Erreur navigation:', error);
      return { success: false, message: error.message };
    }
  });

  // ==================== OPEN EXTERNAL ====================
  ipcMain.handle('navigation:open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur ouverture externe:', error);
      return { success: false, message: error.message };
    }
  });

  // ==================== OPEN IN APP ====================
  ipcMain.handle('navigation:open-in-app', async (event, url) => {
    try {
      if (!mainWindow) {
        return { success: false, message: 'Fenêtre non disponible' };
      }
      
      console.log('📱 Ouverture dans l\'application:', url);
      mainWindow.webContents.send('navigate', url);
      mainWindow.focus();
      
      return { success: true, url };
    } catch (error) {
      console.error('❌ Erreur openInApp:', error);
      return { success: false, message: error.message };
    }
  });

  // ==================== GET CURRENT URL ====================
  ipcMain.handle('navigation:get-current-url', async () => {
    try {
      if (!mainWindow) {
        return { success: false, url: '' };
      }
      const url = mainWindow.webContents.getURL();
      return { success: true, url };
    } catch (error) {
      console.error('❌ Erreur getCurrentUrl:', error);
      return { success: false, url: '' };
    }
  });

  // ==================== RELOAD ====================
  ipcMain.handle('navigation:reload', async () => {
    try {
      if (!mainWindow) {
        return { success: false, message: 'Fenêtre non disponible' };
      }
      mainWindow.reload();
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur reload:', error);
      return { success: false, message: error.message };
    }
  });

  // ==================== GO BACK ====================
  ipcMain.handle('navigation:go-back', async () => {
    try {
      if (!mainWindow) {
        return { success: false, message: 'Fenêtre non disponible' };
      }
      if (mainWindow.webContents.canGoBack()) {
        mainWindow.webContents.goBack();
        return { success: true };
      }
      return { success: false, message: 'Pas de page précédente' };
    } catch (error) {
      console.error('❌ Erreur goBack:', error);
      return { success: false, message: error.message };
    }
  });
};

module.exports = { 
  registerNavigationHandlers,
  initNavigation
};