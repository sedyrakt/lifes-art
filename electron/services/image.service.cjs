// ============================================================
// electron/services/image.service.cjs - CORRIGÉ (TSY MILA DB)
// ⭐ Tsy misy require('database/...') intsony
// ⭐ Production Safe (Hardcoded constants)
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
const DEBUG = false;

function log(...args) { if (DEBUG) console.log(...args); }
function error(...args) { console.error(...args); }

// ⭐ FANITSARA: Hardcoded ny MAX_SIZE_MB mba tsy hiankina amin'ny process.env
const MAX_SIZE_MB = 10;
const MAX_IMAGE_SIZE = MAX_SIZE_MB * 1024 * 1024;

// ⭐ FANITSARA: Mampiasa app.getPath('userData') mivantana fa tsy process.env.USER_DATA
const { app } = require('electron');
const UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');

const SUB_FOLDERS = Object.freeze(['produits', 'categories', 'clients', 'employes', 'fournisseurs', 'utilisateurs', 'company']);

function ensureDirectories() {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    for (const folder of SUB_FOLDERS) {
      fs.mkdirSync(path.join(UPLOADS_DIR, folder), { recursive: true });
    }
  } catch (err) { error('❌ ensureDirectories:', err.message); }
}
ensureDirectories();

function isValidFolder(folder) { return SUB_FOLDERS.includes(folder); }

function cleanImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return null;
  let clean = imagePath.trim()
    .replace(/^local-image:\/\/\/?/i, '')
    .replace(/^file:\/\/\/?/i, '')
    .replace(/^\/uploads\//i, '')
    .replace(/^uploads\//i, '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  clean = path.posix.normalize(clean);
  if (clean === '.' || clean.startsWith('../') || clean.includes('/../') || path.posix.isAbsolute(clean)) return null;
  return clean;
}

function isInsideUploads(targetPath) {
  const base = path.resolve(UPLOADS_DIR);
  const target = path.resolve(targetPath);
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// ------------------------------------------------------------
// SAVE IMAGE (Async)
// ------------------------------------------------------------
async function saveImage(base64Data, folder = 'produits') {
  log(`📸 saveImage: folder=${folder}`);
  try {
    if (!isValidFolder(folder)) return { success: false, error: 'Dossier image invalide' };
    const match = base64Data.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg);base64,(.+)$/i);
    if (!match) return { success: false, error: 'Format image non supporté' };
    const ext = (match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase());
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_IMAGE_SIZE) return { success: false, error: `Image trop grande (max ${MAX_SIZE_MB}MB)` };
    const folderPath = path.join(UPLOADS_DIR, folder);
    if (!isInsideUploads(folderPath)) return { success: false, error: 'Chemin non autorisé' };
    await fs.promises.mkdir(folderPath, { recursive: true });
    const fileName = `img_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(folderPath, fileName);
    await fs.promises.writeFile(filePath, buffer);
    const relativePath = `${folder}/${fileName}`;
    log(`✅ saveImage: ${relativePath}`);
    return { success: true, data: relativePath };
  } catch (err) { error('❌ saveImage:', err.message); return { success: false, error: err.message }; }
}

// ------------------------------------------------------------
// DELETE IMAGE (Async)
// ------------------------------------------------------------
async function deleteImage(imagePath) {
  log(`🗑️ deleteImage: ${imagePath}`);
  try {
    const clean = cleanImagePath(imagePath);
    if (!clean) return { success: false, error: 'Chemin image invalide' };
    const fullPath = path.join(UPLOADS_DIR, clean);
    if (!isInsideUploads(fullPath)) return { success: false, error: 'Chemin non autorisé' };
    try { await fs.promises.unlink(fullPath); log(`✅ deleteImage: ${clean}`); return { success: true }; }
    catch (err) { if (err.code === 'ENOENT') return { success: true }; throw err; }
  } catch (err) { error('❌ deleteImage:', err.message); return { success: false, error: err.message }; }
}

// ------------------------------------------------------------
// GET IMAGE URL (Async)
// ------------------------------------------------------------
async function getImageUrl(imagePath) {
  log(`🔍 getImageUrl: ${imagePath}`);
  try {
    const clean = cleanImagePath(imagePath);
    if (!clean) return { success: true, data: null };
    const directPath = path.join(UPLOADS_DIR, clean);
    if (isInsideUploads(directPath) && fs.existsSync(directPath)) {
      return { success: true, data: `local-image://${clean}` };
    }
    const fileName = path.basename(clean);
    for (const folder of SUB_FOLDERS) {
      const candidate = path.join(UPLOADS_DIR, folder, fileName);
      if (isInsideUploads(candidate) && fs.existsSync(candidate)) {
        const relative = path.relative(UPLOADS_DIR, candidate).replace(/\\/g, '/');
        return { success: true, data: `local-image://${relative}` };
      }
    }
    log(`ℹ️ Image absente: ${clean}`);
    return { success: true, data: null };
  } catch (err) { error('❌ getImageUrl:', err.message); return { success: true, data: null }; }
}

// ------------------------------------------------------------
// GET BASE64 (Async)
// ------------------------------------------------------------
async function getImageAsBase64(imagePath) {
  log(`🔄 getImageAsBase64: ${imagePath}`);
  try {
    const clean = cleanImagePath(imagePath);
    if (!clean) return { success: false, error: 'Chemin invalide' };
    let fullPath = path.join(UPLOADS_DIR, clean);
    if (!isInsideUploads(fullPath) || !fs.existsSync(fullPath)) {
      const fileName = path.basename(clean);
      let found = null;
      for (const folder of SUB_FOLDERS) {
        const candidate = path.join(UPLOADS_DIR, folder, fileName);
        if (isInsideUploads(candidate) && fs.existsSync(candidate)) { found = candidate; break; }
      }
      if (!found) return { success: false, error: 'Image non trouvée' };
      fullPath = found;
    }
    const buffer = await fs.promises.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase().substring(1);
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    return { success: true, data: `data:image/${mime};base64,${buffer.toString('base64')}` };
  } catch (err) { error('❌ getImageAsBase64:', err.message); return { success: false, error: err.message }; }
}

module.exports = { saveImage, deleteImage, getImageUrl, getImageAsBase64, UPLOADS_DIR, SUB_FOLDERS };