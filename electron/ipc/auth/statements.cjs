// ============================================================
// electron/ipc/auth/statements.cjs
// ⭐ VERSION COMPLETE - Mifanaraka amin'ny tables.cjs
// ⭐ FIX: Re-prepare automatique rehefa vaovao ny db instance
// ============================================================
'use strict';

const { getDb } = require('../../database/connection.cjs');
const { log, error } = require('./logger.cjs');

// ============================================================
// STATEMENTS - VARIABLES
// ============================================================

let stmtGetUserByEmail = null;
let stmtGetUserById = null;
let stmtGetUserByIdWithStatus = null;
let stmtInsertSession = null;
let stmtDeleteSession = null;
let stmtDeleteSessionsByUser = null;
let stmtDeleteExpiredSessions = null;
let stmtGetSession = null;
let stmtGetSessionsByUser = null;
let stmtUpdateUserLastLogin = null;
let stmtUpdateUserPassword = null;
let stmtUpdateUser2FA = null;
let stmtUpdateUser2FADisable = null;

// ⭐ VAOVAO: Track ny db instance izay nanaovana prepare
let lastPreparedDb = null;

// ============================================================
// PRÉPARATION DES STATEMENTS
// ⭐ FIX: Skip rehefa mitovy ny db instance
// ============================================================
function prepareStatements(force = false) {
  try {
    const db = getDb();

    if (!db || !db.open) {
      error('❌ [auth.statements] DB indisponible');
      lastPreparedDb = null;
      return false;
    }

    // ⭐ FIX: Skip raha mitovy ny db instance ary efa vonona
    if (!force && lastPreparedDb === db && stmtGetUserByEmail && stmtGetUserById) {
      return true;
    }

    log('🔄 [auth.statements] Re-préparation des statements...');

    // ⭐ Vérifier si les tables existent
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('utilisateurs', 'sessions')
    `).all();
    
    const tableNames = tables.map(t => t.name);
    log('📋 Tables trouvées:', tableNames.join(', '));

    if (!tableNames.includes('utilisateurs')) {
      error('❌ [auth.statements] Table "utilisateurs" introuvable');
      lastPreparedDb = null;
      return false;
    }

    // ⭐ Vérifier les colonnes de la table utilisateurs
    const userColumns = db.prepare(`PRAGMA table_info(utilisateurs)`).all();
    const userColumnNames = userColumns.map(c => c.name);
    log('📋 Colonnes utilisateurs:', userColumnNames.join(', '));

    // ⭐ Vérifier les colonnes nécessaires
    const requiredColumns = ['id', 'email', 'password'];
    for (const col of requiredColumns) {
      if (!userColumnNames.includes(col)) {
        error(`❌ [auth.statements] Colonne "${col}" manquante dans utilisateurs`);
        lastPreparedDb = null;
        return false;
      }
    }

    // ⭐ Colonnes optionnelles avec valeurs par défaut
    const hasFirstName = userColumnNames.includes('firstName');
    const hasLastName = userColumnNames.includes('lastName');
    const hasRole = userColumnNames.includes('role');
    const hasCompanyName = userColumnNames.includes('companyName');
    const hasPhone = userColumnNames.includes('phone');
    const hasImage = userColumnNames.includes('image');
    const hasStatus = userColumnNames.includes('status');
    const hasTwoFactorEnabled = userColumnNames.includes('twoFactorEnabled');
    const hasTwoFactorSecret = userColumnNames.includes('twoFactorSecret');
    const hasLastLogin = userColumnNames.includes('lastLogin');
    const hasCreatedAt = userColumnNames.includes('created_at');
    const hasUpdatedAt = userColumnNames.includes('updated_at');

    // ============================================================
    // CONSTRUIRE LES SELECTS DYNAMIQUEMENT
    // ============================================================
    
    const selectUserFields = `
      u.id,
      u.email,
      u.password
      ${hasFirstName ? ', u.firstName' : ", '' AS firstName"}
      ${hasLastName ? ', u.lastName' : ", '' AS lastName"}
      ${hasRole ? ', u.role' : ", 'user' AS role"}
      ${hasCompanyName ? ', u.companyName' : ", '' AS companyName"}
      ${hasPhone ? ', u.phone' : ", '' AS phone"}
      ${hasImage ? ', u.image' : ", '' AS image"}
      ${hasStatus ? ', u.status' : ", 'actif' AS status"}
      ${hasTwoFactorEnabled ? ', u.twoFactorEnabled' : ', 0 AS twoFactorEnabled'}
      ${hasTwoFactorSecret ? ', u.twoFactorSecret' : ", '' AS twoFactorSecret"}
      ${hasLastLogin ? ', u.lastLogin' : ", '' AS lastLogin"}
      ${hasCreatedAt ? ', u.created_at' : ", '' AS created_at"}
      ${hasUpdatedAt ? ', u.updated_at' : ", '' AS updated_at"}
    `;

    // ⭐ GET USER BY EMAIL
    stmtGetUserByEmail = db.prepare(`
      SELECT ${selectUserFields}
      FROM utilisateurs u
      WHERE u.email = ?
      LIMIT 1
    `);

    // ⭐ GET USER BY ID
    stmtGetUserById = db.prepare(`
      SELECT ${selectUserFields}
      FROM utilisateurs u
      WHERE u.id = ?
      LIMIT 1
    `);

    // ⭐ GET USER BY ID WITH STATUS
    stmtGetUserByIdWithStatus = db.prepare(`
      SELECT ${selectUserFields}
      FROM utilisateurs u
      WHERE u.id = ?
      AND u.status = 'actif'
      LIMIT 1
    `);

    // ⭐ UPDATE USER LAST LOGIN (raha misy ny colonne)
    if (hasLastLogin) {
      stmtUpdateUserLastLogin = db.prepare(`
        UPDATE utilisateurs SET lastLogin = ? WHERE id = ?
      `);
    } else {
      // Fallback: tsy manao update
      stmtUpdateUserLastLogin = {
        run: () => { return { changes: 0 }; }
      };
    }

    // ⭐ UPDATE USER PASSWORD
    stmtUpdateUserPassword = db.prepare(`
      UPDATE utilisateurs SET password = ? WHERE id = ?
    `);

    // ⭐ UPDATE USER 2FA (raha misy ny colonnes)
    if (hasTwoFactorEnabled && hasTwoFactorSecret) {
      stmtUpdateUser2FA = db.prepare(`
        UPDATE utilisateurs SET twoFactorSecret = ?, twoFactorEnabled = 1 WHERE id = ?
      `);
      stmtUpdateUser2FADisable = db.prepare(`
        UPDATE utilisateurs SET twoFactorEnabled = 0, twoFactorSecret = NULL WHERE id = ?
      `);
    } else {
      stmtUpdateUser2FA = {
        run: () => { return { changes: 0 }; }
      };
      stmtUpdateUser2FADisable = {
        run: () => { return { changes: 0 }; }
      };
    }

    // ============================================================
    // SESSIONS (raha misy ny table)
    // ============================================================
    if (tableNames.includes('sessions')) {
      const sessionColumns = db.prepare(`PRAGMA table_info(sessions)`).all();
      const sessionColumnNames = sessionColumns.map(c => c.name);
      log('📋 Colonnes sessions:', sessionColumnNames.join(', '));

      const hasToken = sessionColumnNames.includes('token');
      const hasUserId = sessionColumnNames.includes('userId');
      const hasExpiresAt = sessionColumnNames.includes('expiresAt');
      const hasCreatedAtSession = sessionColumnNames.includes('createdAt');

      if (hasToken && hasUserId && hasExpiresAt) {
        // ⭐ INSERT SESSION
        stmtInsertSession = db.prepare(`
          INSERT INTO sessions (token, userId, expiresAt${hasCreatedAtSession ? ', createdAt' : ''})
          VALUES (?, ?, ?${hasCreatedAtSession ? ', ?' : ''})
        `);

        // ⭐ DELETE SESSION
        stmtDeleteSession = db.prepare(`
          DELETE FROM sessions WHERE token = ?
        `);

        // ⭐ DELETE SESSIONS BY USER
        stmtDeleteSessionsByUser = db.prepare(`
          DELETE FROM sessions WHERE userId = ?
        `);

        // ⭐ DELETE EXPIRED SESSIONS
        stmtDeleteExpiredSessions = db.prepare(`
          DELETE FROM sessions WHERE expiresAt < datetime('now')
        `);

        // ⭐ GET SESSION
        stmtGetSession = db.prepare(`
          SELECT token, userId, expiresAt
          FROM sessions
          WHERE token = ?
          LIMIT 1
        `);

        // ⭐ GET SESSIONS BY USER
        stmtGetSessionsByUser = db.prepare(`
          SELECT token, userId, expiresAt, createdAt
          FROM sessions
          WHERE userId = ?
          ORDER BY createdAt DESC
        `);
      } else {
        log('⚠️ [auth.statements] Table sessions incomplète, statements ignorés');
      }
    } else {
      log('⚠️ [auth.statements] Table sessions introuvable, création ignorée');
    }

    // ⭐ Tehirizo ny db instance nanaovana prepare
    lastPreparedDb = db;

    log('✅ [auth.statements] Statements préparés avec succès (db instance tracké)');
    return true;

  } catch (err) {
    error('❌ [auth.statements] Erreur:', err.message);
    if (err.stack) error(err.stack);
    
    // Reset all statements
    stmtGetUserByEmail = null;
    stmtGetUserById = null;
    stmtGetUserByIdWithStatus = null;
    stmtInsertSession = null;
    stmtDeleteSession = null;
    stmtDeleteSessionsByUser = null;
    stmtDeleteExpiredSessions = null;
    stmtGetSession = null;
    stmtGetSessionsByUser = null;
    stmtUpdateUserLastLogin = null;
    stmtUpdateUserPassword = null;
    stmtUpdateUser2FA = null;
    stmtUpdateUser2FADisable = null;
    // ⭐ RESET ny db instance tracking
    lastPreparedDb = null;
    
    return false;
  }
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  prepareStatements,
  get stmtGetUserByEmail() { return stmtGetUserByEmail; },
  get stmtGetUserById() { return stmtGetUserById; },
  get stmtGetUserByIdWithStatus() { return stmtGetUserByIdWithStatus; },
  get stmtInsertSession() { return stmtInsertSession; },
  get stmtDeleteSession() { return stmtDeleteSession; },
  get stmtDeleteSessionsByUser() { return stmtDeleteSessionsByUser; },
  get stmtDeleteExpiredSessions() { return stmtDeleteExpiredSessions; },
  get stmtGetSession() { return stmtGetSession; },
  get stmtGetSessionsByUser() { return stmtGetSessionsByUser; },
  get stmtUpdateUserLastLogin() { return stmtUpdateUserLastLogin; },
  get stmtUpdateUserPassword() { return stmtUpdateUserPassword; },
  get stmtUpdateUser2FA() { return stmtUpdateUser2FA; },
  get stmtUpdateUser2FADisable() { return stmtUpdateUser2FADisable; }
};