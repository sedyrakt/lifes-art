// ============================================================
// electron/ipc/images.cjs - CORRIGÉ (utilise le service)
// ⭐ FIX: Mamerina `true` mba tsy hiteraka ilay "function returned false"
// ============================================================
const { ipcMain } = require('electron');
const { saveImage, deleteImage, getImageUrl, getImageAsBase64 } = require('../services/image.service.cjs');

function registerImagesHandlers(ipcMain) {
  if (!ipcMain) return false;

  // UPLOAD
  ipcMain.handle('images:upload', async (_, base64Data, folder = 'produits') => {
    try {
      return await saveImage(base64Data, folder);
    } catch (err) {
      console.error('[images:upload]', err);
      return { success: false, error: err.message };
    }
  });

  // DELETE
  ipcMain.handle('images:delete', async (_, imagePath) => {
    try {
      return await deleteImage(imagePath);
    } catch (err) {
      console.error('[images:delete]', err);
      return { success: false, error: err.message };
    }
  });

  // GET URL
  ipcMain.handle('images:get-url', async (_, imagePath) => {
    try {
      return await getImageUrl(imagePath);
    } catch (err) {
      console.error('[images:get-url]', err);
      return { success: false, error: err.message };
    }
  });

  // GET BASE64
  ipcMain.handle('images:get-image-as-base64', async (_, imagePath) => {
    try {
      return await getImageAsBase64(imagePath);
    } catch (err) {
      console.error('[images:get-image-as-base64]', err);
      return { success: false, error: err.message };
    }
  });

  console.log('✅ Images handlers enregistrés (via image.service.cjs)');
  return true; // ⭐ FIX: Mamerina true
}

module.exports = { registerImagesHandlers };