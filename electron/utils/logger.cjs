// ============================================================
// electron/utils/logger.cjs - VERSION SIMPLIFIÉE
// ⭐ Tsy miankina amin'ny queries.cjs na utils.cjs intsony
// ⭐ Mampiasa getDb() mivantana
// ============================================================

const fs = require('fs');
const path = require('path');
const { getDb } = require('../database/connection.cjs');

// ============================================================
// CONSTANTES
// ============================================================
const LOG_LEVEL = 'info';
const LOG_FILE = './logs/app.log';
const LOG_DIR = path.dirname(LOG_FILE);
const LOG_QUEUE_SIZE = 100;

// ============================================================
// CREER DOSSIER LOGS
// ============================================================
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Impossible de créer le dossier logs:', err.message);
}

// ============================================================
// LEVELS
// ============================================================
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = LEVELS[LOG_LEVEL] || LEVELS.info;

// ============================================================
// LOG QUEUE
// ============================================================
let logQueue = [];
let isWriting = false;

const flushLogQueue = () => {
  if (isWriting || logQueue.length === 0) return;

  isWriting = true;
  const queue = logQueue.slice();
  logQueue = [];

  try {
    const content = queue.join('');
    fs.appendFileSync(LOG_FILE, content);
  } catch (_) {
    // ignore
  } finally {
    isWriting = false;
    if (logQueue.length > 0) {
      setImmediate(flushLogQueue);
    }
  }
};

const logToFile = (level, message, data = null) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data || undefined,
    };
    const logLine = JSON.stringify(logEntry) + '\n';
    logQueue.push(logLine);

    if (logQueue.length >= LOG_QUEUE_SIZE) {
      flushLogQueue();
    } else {
      setImmediate(flushLogQueue);
    }
  } catch (_) {}
};

// ============================================================
// LOGGER PRINCIPAL
// ============================================================
const shouldLog = (level) => LEVELS[level] >= CURRENT_LEVEL;

const log = (level, message, data = null) => {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const logFn = console[level] || console.log;
  logFn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
  logToFile(level, message, data);
};

// ============================================================
// ⭐ SECURITY LOG - SYNCHRONOUS (sans dépendances externes)
// ============================================================
const logSecurityEvent = (email, action, ip, userAgent, status = 1, details = '') => {
  try {
    // ⭐ Normaliser les paramètres
    const safeIp = typeof ip === 'string' ? ip : (ip?.toString?.() || '127.0.0.1');
    const safeUserAgent = typeof userAgent === 'string' ? userAgent : (userAgent?.toString?.() || 'Electron');
    const safeEmail = typeof email === 'string' ? email : 'anonymous';
    const safeDetails = typeof details === 'string' ? details : JSON.stringify(details || '');
    const safeStatus = Number(status) || 0;

    // ⭐ Vérifier la connexion DB
    const db = getDb();
    if (!db || !db.open) {
      console.warn('⚠️ [logger] Database non disponible, log ignoré');
      return;
    }

    // ⭐ Vérifier si la table existe
    try {
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = 'security_logs'"
      ).get();
      
      if (!tableExists) {
        console.warn('⚠️ [logger] Table security_logs inexistante, log ignoré');
        return;
      }

      // ⭐ Insérer le log
      db.prepare(`
        INSERT INTO security_logs (email, action, ip, userAgent, status, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(safeEmail, action, safeIp, safeUserAgent, safeStatus, safeDetails);

    } catch (dbErr) {
      console.warn('⚠️ [logger] Erreur DB:', dbErr.message);
      return;
    }

    // Log dans le fichier aussi
    log('info', `[SECURITY] ${action} - ${safeEmail}`, { ip: safeIp, status: safeStatus });
  } catch (err) {
    console.warn('⚠️ [logger] Erreur logSecurityEvent:', err.message);
    log('error', `[SECURITY] Erreur log: ${err.message}`, { email, action });
  }
};

// ============================================================
// ⭐ EXPORTS
// ============================================================
module.exports = {
  log,
  logSecurityEvent,
  logToFile,
  flushLogQueue,
  LEVELS,
  LOG_LEVEL,
  LOG_FILE,
};