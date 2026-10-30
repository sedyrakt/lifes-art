'use strict';
// ============================================================
// electron/ipc/backup.cjs
// LIFE'S ART ERP — Backup / Restore / Export Handlers
// ⭐ FIX: Restore robuste misy rollback automatique
// ⭐ FIX: Vérification post-restore (tables + connexion)
// ⭐ FIX: Event notifications alohan'ny reload
// ⭐ FIX: WAL/SHM cleanup + forceReconnect
// ============================================================

const path = require('path');
const fs = require('fs');
const {
  getDb,
  getDbPath: getDbPathFromConnection,
  closeDatabase,
  forceReconnect,
} = require('../database/connection.cjs');
const { log, error } = require('../database/utils.cjs');
const { dialog, app, BrowserWindow } = require('electron');

// ════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════
const BACKUP_ENABLED = process.env.BACKUP_ENABLED !== 'false';
const BACKUP_AUTO_INTERVAL_HOURS = parseInt(process.env.BACKUP_AUTO_INTERVAL_HOURS) || 24;
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
const BACKUP_COMPRESS = process.env.BACKUP_COMPRESS !== 'false';
const BACKUP_DIR = process.env.DB_BACKUP_PATH || path.join(__dirname, '../../backups');

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function getDbPath() {
  try {
    return getDbPathFromConnection();
  } catch (err) {
    error('⚠️ Erreur getDbPath:', err.message);
    return null;
  }
}

function logSecurityEventSync(action, entity, details = '', entityName = '') {
  try {
    const db = getDb();
    if (!db || !db.open) return;
    db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at)
      VALUES (?, ?, 0, ?, 0, ?, datetime('now'))
    `).run(action, entity, entityName, details);
  } catch (err) {
    error('⚠️ Erreur audit log:', err.message);
  }
}

function cleanupOldBackups() {
  if (!BACKUP_ENABLED) return;
  try {
    const now = Date.now();
    const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs.readdirSync(BACKUP_DIR);
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) continue;
        if (/\.(db|db\.gz|db\.backup|json)$/.test(file)) {
          if ((now - stat.mtimeMs) > retentionMs) {
            fs.unlinkSync(filePath);
            deleted++;
          }
        }
      } catch (_) {}
    }

    if (deleted > 0) log(`✅ Nettoyage: ${deleted} fichier(s) supprimé(s)`);
  } catch (err) {
    error('⚠️ Erreur cleanup:', err.message);
  }
}

function cleanupWalShmFiles(dbPath) {
  for (const suffix of ['-wal', '-shm']) {
    const filePath = `${dbPath}${suffix}`;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        log(`🗑️ Fichier ${suffix} supprimé: ${filePath}`);
      }
    } catch (err) {
      error(`⚠️ Erreur cleanup ${suffix}:`, err.message);
    }
  }
}

// ════════════════════════════════════════════════════════════
// ⭐ Force reload ny fenêtre rehetra
// ════════════════════════════════════════════════════════════
function forceReloadAllWindows(reason = 'restore') {
  try {
    const windows = BrowserWindow.getAllWindows();
    if (!windows.length) {
      log('⚠️ Aucune fenêtre à recharger');
      return;
    }

    windows.forEach((win) => {
      if (!win || win.isDestroyed()) return;
      try {
        log(`🔄 Reload fenêtre (${reason})...`);

        // ⭐ Alefaso ny events alohan'ny reload mba ho voaray
        try {
          win.webContents.send('app:dataReloaded', { reason, timestamp: Date.now() });
          win.webContents.send('dashboard:changed', { reason });
          win.webContents.send('financial:changed', { reason });
          win.webContents.send('products:changed', { reason });
        } catch (_) {}

        // ⭐ Delay kely mba ho voaray ny event alohan'ny reload
        setTimeout(() => {
          try {
            if (!win.isDestroyed()) win.webContents.reload();
          } catch (reloadErr) {
            error('❌ reload webContents:', reloadErr?.message);
          }
        }, 150);
      } catch (err) {
        error(`❌ Erreur reload fenêtre [${reason}]:`, err?.message);
      }
    });
  } catch (err) {
    error('❌ forceReloadAllWindows:', err?.message);
  }
}

// ════════════════════════════════════════════════════════════
// ⭐ BACKUP DATABASE (async)
// ════════════════════════════════════════════════════════════
async function backupDatabaseSync(destinationPath = null) {
  if (!BACKUP_ENABLED) return { success: false, error: 'Backup désactivé' };

  try {
    const db = getDb();
    if (!db || !db.open) {
      return { success: false, error: 'Base de données non disponible' };
    }

    const dbPath = getDbPath();
    if (!dbPath || !fs.existsSync(dbPath)) {
      return { success: false, error: 'Fichier DB introuvable' };
    }

    let backupPath;
    if (!destinationPath) {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = path.join(BACKUP_DIR, `backup_${timestamp}.db`);
    } else {
      backupPath = destinationPath;
    }

    // ⭐ VACUUM INTO (méthode recommandée SQLite)
    try {
      db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
      log(`📦 Backup physique créé: ${backupPath}`);
    } catch (vacuumErr) {
      error('⚠️ VACUUM INTO tsy nahomby, fallback copy:', vacuumErr.message);

      try {
        try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
        closeDatabase();
        fs.copyFileSync(dbPath, backupPath);

        const { initDatabase } = require('../database/init.cjs');
        await initDatabase();
        log(`📦 Backup par copie directe: ${backupPath}`);
      } catch (copyErr) {
        error('❌ Fallback copy tsy nahomby:', copyErr.message);
        return { success: false, error: copyErr.message };
      }
    }

    // ⭐ Compression (raha backup auto)
    if (BACKUP_COMPRESS && !destinationPath) {
      try {
        const zlib = require('zlib');
        const data = fs.readFileSync(backupPath);
        const compressed = zlib.gzipSync(data);
        const gzPath = backupPath + '.gz';
        fs.writeFileSync(gzPath, compressed);
        fs.unlinkSync(backupPath);
        backupPath = gzPath;
        log(`📦 Backup compressé: ${backupPath}`);
      } catch (err) {
        error('⚠️ Erreur compression:', err.message);
      }
    }

    logSecurityEventSync('backup_created', 'system', `Path: ${backupPath}`, backupPath);
    cleanupOldBackups();

    return { success: true, path: backupPath };
  } catch (err) {
    error('❌ Erreur backup:', err.message);
    logSecurityEventSync('backup_failed', 'system', err.message, '');
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════
// ⭐ EXPORT ALL DATA → JSON
// ════════════════════════════════════════════════════════════
function exportAllDataSync() {
  try {
    const db = getDb();
    if (!db || !db.open) return { success: false, error: 'Base de données non disponible' };

    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE 'fts%'
        AND name NOT LIKE '%_fts'
    `).all();

    const data = {};
    for (const t of tables) {
      data[t.name] = db.prepare(`SELECT * FROM "${t.name}"`).all();
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(BACKUP_DIR, `export_${timestamp}.json`);

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
    log(`📦 Export JSON créé: ${exportPath} (${Object.keys(data).length} tables)`);
    logSecurityEventSync('export_json', 'system', `Path: ${exportPath}`, exportPath);

    return { success: true, path: exportPath, tables: Object.keys(data) };
  } catch (err) {
    error('❌ Erreur export JSON:', err.message);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════
// ⭐ REGISTER HANDLERS
// ════════════════════════════════════════════════════════════
function registerBackupHandlers(ipcMain) {
  if (!ipcMain) return false;
  log('💾 Enregistrement des handlers backup...');

  const channels = [
    'backup:database', 'backup:restore', 'backup:vacuum', 'backup:optimize',
    'backup:list', 'backup:delete', 'backup:auto', 'backup:status', 'backup:export-json'
  ];
  for (const ch of channels) {
    try { ipcMain.removeHandler(ch); } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  // ⭐ BACKUP: DATABASE
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:database', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Enregistrer la sauvegarde',
        defaultPath: path.join(
          app.getPath('documents'),
          `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`
        ),
        filters: [
          { name: 'Base de données', extensions: ['db'] },
          { name: 'Tous les fichiers', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      return await backupDatabaseSync(result.filePath);
    } catch (err) {
      error('❌ backup:database', err.message);
      return { success: false, error: err.message };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ BACKUP: RESTORE — ROBUSTE + ROLLBACK
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:restore', async (event, backupPath) => {
    let extractedTempPath = null;
    let originalBackupPath = null;
    let originalBackedUp = false;
    let dbPath = null;

    try {
      // 1️⃣ Validation fichier source
      const normalizedPath = path.normalize(backupPath);
      if (!fs.existsSync(normalizedPath)) {
        return {
          success: false,
          error: 'Fichier backup non trouvé. Vérifiez que le fichier existe toujours.'
        };
      }

      // 2️⃣ Décompression si .gz
      let realPath = normalizedPath;
      if (normalizedPath.endsWith('.gz')) {
        try {
          const zlib = require('zlib');
          const compressed = fs.readFileSync(normalizedPath);
          const data = zlib.gunzipSync(compressed);
          const tempPath = normalizedPath.replace(/\.gz$/, '');
          fs.writeFileSync(tempPath, data);
          realPath = tempPath;
          extractedTempPath = tempPath;
          log(`📦 Décompression terminée: ${tempPath}`);
        } catch (decompressErr) {
          return {
            success: false,
            error: `Erreur de décompression: ${decompressErr.message}`
          };
        }
      }

      // 3️⃣ Résolution DB path
      dbPath = getDbPath();
      if (!dbPath) {
        if (extractedTempPath) {
          try { fs.unlinkSync(extractedTempPath); } catch (_) {}
        }
        return {
          success: false,
          error: 'Impossible de localiser la base de données cible.'
        };
      }

      // 4️⃣ Notification renderer (restore commence)
      try {
        const win = event.sender ? BrowserWindow.fromWebContents(event.sender) : null;
        if (win && !win.isDestroyed()) {
          win.webContents.send('app:restore-starting', { timestamp: Date.now() });
        }
      } catch (_) {}

      // 5️⃣ Sauvegarde de l'ORIGINAL (rollback safety)
      if (fs.existsSync(dbPath)) {
        originalBackupPath = `${dbPath}.restore-rollback`;
        try {
          // Checkpoint alohan'ny copy
          try {
            const db = getDb();
            if (db && db.open) {
              try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
            }
          } catch (_) {}

          fs.copyFileSync(dbPath, originalBackupPath);

          // Copier aussi WAL/SHM si présents
          for (const suffix of ['-wal', '-shm']) {
            const src = `${dbPath}${suffix}`;
            if (fs.existsSync(src)) {
              try { fs.copyFileSync(src, `${originalBackupPath}${suffix}`); } catch (_) {}
            }
          }
          originalBackedUp = true;
          log(`🛡️ Original DB sauvegardée → ${originalBackupPath}`);
        } catch (backupErr) {
          error('⚠️ Impossible de sauvegarder DB originale:', backupErr.message);
        }
      }

      // 6️⃣ Checkpoint + close
      try {
        const db = getDb();
        if (db && db.open) {
          try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
        }
      } catch (_) {}

      closeDatabase();
      log('🛑 DB fermée avant restauration');

      // 7️⃣ Cleanup WAL/SHM + remplacement
      cleanupWalShmFiles(dbPath);
      fs.copyFileSync(realPath, dbPath);
      log(`✅ Fichier DB remplacé: ${realPath} → ${dbPath}`);

      // 8️⃣ Réinitialisation + VÉRIFICATION
      const { initDatabase } = require('../database/init.cjs');
      await initDatabase();
      log('✅ DB réinitialisée après restauration');

      // ⭐ Force reconnect mba ho azo antoka
      const verifyDb = forceReconnect();
      if (!verifyDb || !verifyDb.open) {
        throw new Error('DB non accessible après initialisation');
      }

      const test = verifyDb.prepare('SELECT 1 AS ok').get();
      if (!test || Number(test.ok) !== 1) {
        throw new Error('Test de connexion DB échoué après restore');
      }

      // ⭐ Vérifier tables essentielles
      const hasProduits = verifyDb.prepare(
        `SELECT 1 FROM sqlite_master WHERE type='table' AND name='produits' LIMIT 1`
      ).get();
      if (!hasProduits) {
        throw new Error('Table "produits" manquante après restore — backup corrompu ?');
      }
      log('✅ Vérifications post-restore OK');

      // 9️⃣ Nettoyage fichiers temporaires
      if (extractedTempPath && extractedTempPath !== normalizedPath) {
        try { fs.unlinkSync(extractedTempPath); } catch (_) {}
      }
      if (originalBackedUp && originalBackupPath) {
        try {
          fs.unlinkSync(originalBackupPath);
          for (const suffix of ['-wal', '-shm']) {
            const p = `${originalBackupPath}${suffix}`;
            try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
          }
        } catch (_) {}
      }

      logSecurityEventSync('restore_success', 'system', `Path: ${backupPath}`, backupPath);

      // 🔟 Reload ny fenêtre — miaraka amin'ny events
      setTimeout(() => forceReloadAllWindows('restore-completed'), 300);

      return {
        success: true,
        message: 'Base de données restaurée avec succès. L\'application va se recharger automatiquement.'
      };
    } catch (err) {
      error('❌ Erreur restauration:', err.message);

      // 🔄 ROLLBACK — Avereno ny DB originale raha nisy backup
      if (originalBackedUp && originalBackupPath && fs.existsSync(originalBackupPath)) {
        try {
          log('🔄 Tentative de rollback vers DB originale...');
          closeDatabase();

          if (dbPath) {
            cleanupWalShmFiles(dbPath);
            fs.copyFileSync(originalBackupPath, dbPath);
            // Restaurer WAL/SHM raha nisy
            for (const suffix of ['-wal', '-shm']) {
              const src = `${originalBackupPath}${suffix}`;
              if (fs.existsSync(src)) {
                try { fs.copyFileSync(src, `${dbPath}${suffix}`); } catch (_) {}
              }
            }
          }

          const { initDatabase } = require('../database/init.cjs');
          await initDatabase();
          forceReconnect();
          log('✅ Rollback réussi — DB originale restaurée');
        } catch (recoverErr) {
          error('❌ Rollback échoué:', recoverErr.message);
        } finally {
          try { fs.unlinkSync(originalBackupPath); } catch (_) {}
          for (const suffix of ['-wal', '-shm']) {
            const p = `${originalBackupPath}${suffix}`;
            try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
          }
        }
      }

      if (extractedTempPath && extractedTempPath !== backupPath) {
        try { fs.unlinkSync(extractedTempPath); } catch (_) {}
      }

      logSecurityEventSync('restore_failed', 'system', err.message, '');
      return {
        success: false,
        error: err.message || 'Erreur inattendue lors de la restauration.'
      };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ VACUUM
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:vacuum', () => {
    try {
      const db = getDb();
      if (!db || !db.open) return { success: false, error: 'DB non disponible' };
      db.exec('VACUUM');
      return { success: true };
    } catch (err) {
      error('❌ backup:vacuum', err.message);
      return { success: false, error: err.message };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ OPTIMIZE
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:optimize', () => {
    try {
      const db = getDb();
      if (!db || !db.open) return { success: false, error: 'DB non disponible' };
      db.exec('ANALYZE');
      db.exec('VACUUM');
      db.pragma('optimize');
      return { success: true };
    } catch (err) {
      error('❌ backup:optimize', err.message);
      return { success: false, error: err.message };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ LIST BACKUPS
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:list', (event, limit = 50) => {
    try {
      const backups = [];
      if (!fs.existsSync(BACKUP_DIR)) {
        return { success: true, data: [], total: 0, limit };
      }

      const files = fs.readdirSync(BACKUP_DIR);
      for (const file of files) {
        const filePath = path.join(BACKUP_DIR, file);
        try {
          const stat = fs.statSync(filePath);
          if (!stat.isDirectory() && /\.(db|db\.gz|db\.backup|json)$/.test(file)) {
            backups.push({
              name: file,
              path: filePath,
              size: stat.size,
              sizeMB: (stat.size / (1024 * 1024)).toFixed(2),
              created: stat.mtime,
              createdISO: stat.mtime.toISOString()
            });
          }
        } catch (_) {}
      }

      backups.sort((a, b) => b.created.getTime() - a.created.getTime());
      return {
        success: true,
        data: backups.slice(0, limit),
        total: backups.length,
        limit
      };
    } catch (err) {
      error('❌ backup:list', err.message);
      return { success: false, error: err.message };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ DELETE BACKUP
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:delete', (event, backupPath) => {
    try {
      if (!backupPath || !backupPath.startsWith(BACKUP_DIR)) {
        return { success: false, error: 'Chemin invalide' };
      }
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Fichier non trouvé' };
      }
      fs.unlinkSync(backupPath);
      logSecurityEventSync('backup_deleted', 'system', `Path: ${backupPath}`, backupPath);
      return { success: true };
    } catch (err) {
      error('❌ backup:delete', err.message);
      return { success: false, error: err.message };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ AUTO BACKUP
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:auto', async () => {
    try {
      return await backupDatabaseSync();
    } catch (err) {
      error('❌ backup:auto', err.message);
      return { success: false, error: err.message };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ STATUS
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:status', () => {
    try {
      const stats = {
        enabled: BACKUP_ENABLED,
        autoIntervalHours: BACKUP_AUTO_INTERVAL_HOURS,
        retentionDays: BACKUP_RETENTION_DAYS,
        compress: BACKUP_COMPRESS,
        backupDir: BACKUP_DIR,
        totalBackups: 0,
        totalSizeMB: 0,
        lastBackup: null
      };

      if (fs.existsSync(BACKUP_DIR)) {
        const files = fs.readdirSync(BACKUP_DIR);
        let totalSize = 0, lastBackupDate = null, validCount = 0;

        for (const file of files) {
          const filePath = path.join(BACKUP_DIR, file);
          try {
            const stat = fs.statSync(filePath);
            if (!stat.isDirectory() && /\.(db|db\.gz|db\.backup|json)$/.test(file)) {
              totalSize += stat.size;
              validCount++;
              if (!lastBackupDate || stat.mtime > lastBackupDate) {
                lastBackupDate = stat.mtime;
              }
            }
          } catch (_) {}
        }

        stats.totalBackups = validCount;
        stats.totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        stats.lastBackup = lastBackupDate ? lastBackupDate.toISOString() : null;
      }

      return { success: true, data: stats };
    } catch (err) {
      error('❌ backup:status', err.message);
      return { success: false, error: err.message };
    }
  });

  // ════════════════════════════════════════════════════════════
  // ⭐ EXPORT JSON
  // ════════════════════════════════════════════════════════════
  ipcMain.handle('backup:export-json', () => {
    try {
      return exportAllDataSync();
    } catch (err) {
      error('❌ backup:export-json', err.message);
      return { success: false, error: err.message };
    }
  });

  log('✅ Backup handlers enregistrés (avec rollback + verification + forceReconnect)');
  return true;
}

// ════════════════════════════════════════════════════════════
// ⭐ EXPORTS
// ════════════════════════════════════════════════════════════
module.exports = {
  registerBackupHandlers,
  backupDatabaseSync,
  exportAllDataSync,
  cleanupOldBackups,
};