// ============================================================
// electron/ipc/auth/handlers.cjs - VERSION COMPLETE A-Z
// ⭐ FIX: withAuthDb → auto-forceReconnect raha tsy misokatra ny DB
// ⭐ FIX: Re-prepare statements isaky ny request (idempotent)
// ============================================================
'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { logSecurityEvent } = require('../../utils/logger.cjs');
const { log, error } = require('./logger.cjs');
const { normalizeEmail, normalizeRow, normalizeRows } = require('./validation.cjs');
const statementsModule = require('./statements.cjs');

// ============================================================
// CONSTANTES
// ============================================================
const JWT_SECRET = 'upA8lN2MfcFQBPge8AbGSRQDVGRwXuqFnfb3B0xh1+2l2oiHmOKdMhoQvzwfv5aqE2Io4a+EFPEWPliSVyiXBQ==';
const JWT_EXPIRES_IN = '24h';
const SESSION_EXPIRY_HOURS = 24;
const TWO_FACTOR_ENABLED = true;
const TWO_FACTOR_WINDOW = 1;
const TWO_FACTOR_APP_NAME = 'FITAIA';
const BCRYPT_SALT_ROUNDS = 12;
const DUMMY_HASH = '$2b$12$5zXG5vD4qXcJ3n7dQyX1UO9YwX8rA2fB3cD5eF6gH7iJ8kL9mN0oP';

console.log('🔐 [auth] JWT_SECRET loaded:', !!JWT_SECRET);

// ============================================================
// HELPERS
// ============================================================

function normalizeUserData(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.role || 'user',
    companyName: user.companyName || '',
    phone: user.phone || '',
    image: user.image || '',
    status: user.status || 'actif',
    twoFactorEnabled: user.twoFactorEnabled === 1 || user.twoFactorEnabled === true,
    created_at: user.created_at || '',
    updated_at: user.updated_at || ''
  };
}

function cleanupExpiredSessions() {
  try {
    const statement = statementsModule.stmtDeleteExpiredSessions;
    if (!statement) {
      error('⚠️ [auth] stmtDeleteExpiredSessions indisponible');
      return;
    }
    const result = statement.run();
    if (result.changes > 0) log(`✅ ${result.changes} sessions expirées supprimées`);
  } catch (err) {
    error('⚠️ Erreur cleanup sessions:', err.message);
  }
}

let cleanupInterval = null;

function startSessionCleanup() {
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
  log('🔄 Nettoyage des sessions programmé (toutes les heures)');
}

// ============================================================
// WITH AUTH DB - WRAPPER (auto-reconnect + re-prepare)
// ============================================================
function withAuthDb(fn) {
  return async (event, ...args) => {
    try {
      let db = getDb();

      // ⭐ FIX: Raha tsy misokatra, manandrana forceReconnect
      if (!db || !db.open) {
        console.warn('⚠️ [auth] DB closed! Trying forceReconnect...');
        try {
          db = forceReconnect();
        } catch (reconnectErr) {
          error('❌ [auth] forceReconnect failed:', reconnectErr?.message);
        }
      }

      if (!db || !db.open) {
        error('❌ [auth] Database connection is not open après forceReconnect');
        return { success: false, error: 'Service de base de données non disponible' };
      }

      // ⭐ Re-prepare statements (idempotent amin'ny lastPreparedDb)
      const prepared = statementsModule.prepareStatements();
      if (!prepared) {
        error('❌ [auth] prepareStatements() a échoué');
        return { success: false, error: 'Service de base de données non disponible' };
      }

      return await fn(event, ...args);
    } catch (err) {
      error('❌ [auth] Erreur handler:', err.message);
      return { success: false, error: err.message };
    }
  };
}

// ============================================================
// REGISTER AUTH HANDLERS
// ============================================================
function registerAuthHandlers(ipcMain) {
  log('🔐 ==========================================');
  log('🔐 [auth.handlers] ENREGISTREMENT HANDLERS AUTH');
  log('🔐 ==========================================');

  if (!ipcMain) {
    error('❌ ipcMain est null/undefined!');
    return false;
  }

  try {
    startSessionCleanup();

    const channels = [
      'auth:login',
      'auth:logout',
      'auth:verify-token',
      'auth:hash-password',
      'auth:verify-password',
      'auth:change-password',
      'auth:generate-2fa',
      'auth:verify-2fa',
      'auth:disable-2fa',
      'auth:verify-2fa-login',
      'auth:reset-password',
      'auth:rehash-password',
      'auth:get-sessions',
      'auth:revoke-session',
      'auth:revoke-all-sessions',
      'auth:check-user-exists',
      'auth:get-user'
    ];

    for (const channel of channels) {
      try { ipcMain.removeHandler(channel); } catch (_) {}
    }

    // ⭐ Prepare voalohany
    try { statementsModule.prepareStatements(); } catch (_) {}

    // ========================================================
    // AUTH: LOGIN
    // ========================================================
    ipcMain.handle('auth:login', withAuthDb(async (event, email, password, ip, userAgent) => {
      try {
        if (!statementsModule.stmtGetUserByEmail) {
          return { success: false, error: 'Service de base de données non disponible' };
        }

        const normalizedEmail = normalizeEmail(email);
        const cleanPassword = password ? password.trim() : '';
        const safeIp = typeof ip === 'string' ? ip : '127.0.0.1';
        const safeUserAgent = typeof userAgent === 'string' ? userAgent : 'Electron';

        log('🔍 [auth:login] Tentative de login pour:', normalizedEmail);

        const user = statementsModule.stmtGetUserByEmail.get(normalizedEmail);

        if (!user) {
          log('❌ [auth:login] Utilisateur non trouvé');
          await bcrypt.compare(cleanPassword, DUMMY_HASH);
          logSecurityEvent(normalizedEmail, 'login_failed', safeIp, safeUserAgent, 0, 'Utilisateur non trouvé');
          return { success: false, error: 'Email ou mot de passe incorrect' };
        }

        let isValid = false;
        try {
          isValid = await bcrypt.compare(cleanPassword, user.password);
        } catch (err) {
          log(`❌ Erreur bcrypt.compare: ${err.message}`);
        }

        if (!isValid) {
          log('❌ [auth:login] Mot de passe incorrect');
          logSecurityEvent(normalizedEmail, 'login_failed', safeIp, safeUserAgent, 0, 'Mot de passe incorrect');
          return { success: false, error: 'Email ou mot de passe incorrect' };
        }

        // Vérifier le statut de l'utilisateur
        if (user.status === 'inactif' || user.status === 'bloqué') {
          log('❌ [auth:login] Compte désactivé');
          logSecurityEvent(normalizedEmail, 'login_failed', safeIp, safeUserAgent, 0, 'Compte désactivé');
          return { success: false, error: 'Compte désactivé ou bloqué' };
        }

        // 2FA
        if (TWO_FACTOR_ENABLED && (user.twoFactorEnabled === 1 || user.twoFactorEnabled === true)) {
          log('🔐 [auth:login] 2FA activé');
          logSecurityEvent(normalizedEmail, '2fa_required', safeIp, safeUserAgent, 1);
          return {
            success: true,
            need2FA: true,
            userId: user.id,
            message: 'Code 2FA requis'
          };
        }

        // Mettre à jour lastLogin
        if (statementsModule.stmtUpdateUserLastLogin) {
          statementsModule.stmtUpdateUserLastLogin.run(new Date().toISOString(), user.id);
        }

        // Générer le token JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        // Créer la session
        const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
        if (statementsModule.stmtInsertSession) {
          statementsModule.stmtInsertSession.run(token, user.id, expiresAt.toISOString(), new Date().toISOString());
        }

        logSecurityEvent(normalizedEmail, 'login_success', safeIp, safeUserAgent, 1);

        return {
          success: true,
          token,
          need2FA: false,
          user: normalizeUserData(user)
        };
      } catch (err) {
        error('❌ [auth:login] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    log('✅ [auth.handlers] auth:login registered successfully');

    // ========================================================
    // AUTH: LOGOUT
    // ========================================================
    ipcMain.handle('auth:logout', withAuthDb(async (event, token) => {
      try {
        if (statementsModule.stmtDeleteSession) {
          statementsModule.stmtDeleteSession.run(token);
        }
        return { success: true };
      } catch (err) {
        error('❌ [auth:logout] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: VERIFY TOKEN
    // ========================================================
    ipcMain.handle('auth:verify-token', withAuthDb(async (event, token) => {
      try {
        if (!statementsModule.stmtGetSession || !statementsModule.stmtGetUserById) {
          return { valid: false, message: 'Service de base de données non disponible' };
        }

        cleanupExpiredSessions();

        const session = statementsModule.stmtGetSession.get(token);
        if (!session) return { valid: false, message: 'Session invalide' };

        if (new Date(session.expiresAt) < new Date()) {
          if (statementsModule.stmtDeleteSession) {
            statementsModule.stmtDeleteSession.run(token);
          }
          return { valid: false, message: 'Session expirée' };
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded.id || !decoded.email) {
          if (statementsModule.stmtDeleteSession) {
            statementsModule.stmtDeleteSession.run(token);
          }
          return { valid: false, message: 'Token invalide' };
        }

        const user = statementsModule.stmtGetUserById.get(decoded.id);

        if (!user || user.status !== 'actif') {
          if (statementsModule.stmtDeleteSession) {
            statementsModule.stmtDeleteSession.run(token);
          }
          return { valid: false, message: 'Utilisateur invalide' };
        }

        if (user.email !== decoded.email) {
          if (statementsModule.stmtDeleteSession) {
            statementsModule.stmtDeleteSession.run(token);
          }
          return { valid: false, message: 'Email mismatch' };
        }

        return {
          valid: true,
          user: normalizeUserData(user)
        };
      } catch (err) {
        error('❌ [auth:verify-token] Erreur:', err.message);
        return { valid: false, message: 'Token invalide' };
      }
    }));

    // ========================================================
    // AUTH: HASH PASSWORD
    // ========================================================
    ipcMain.handle('auth:hash-password', withAuthDb(async (event, password) => {
      try {
        const cleanPassword = password ? password.trim() : '';
        if (!cleanPassword) {
          return { success: false, error: 'Le mot de passe est requis' };
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hash = await bcrypt.hash(cleanPassword, salt);

        if (!hash || hash.length !== 60) {
          return { success: false, error: 'Erreur lors du hashage' };
        }

        return { success: true, hash };
      } catch (err) {
        error('❌ [auth:hash-password] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: VERIFY PASSWORD
    // ========================================================
    ipcMain.handle('auth:verify-password', withAuthDb(async (event, password, hashedPassword) => {
      try {
        if (!hashedPassword || typeof hashedPassword !== 'string' || hashedPassword.length !== 60) {
          return { success: false };
        }
        const isValid = await bcrypt.compare(password, hashedPassword);
        return { success: isValid };
      } catch (err) {
        error('❌ [auth:verify-password] Erreur:', err.message);
        return { success: false };
      }
    }));

    // ========================================================
    // AUTH: CHANGE PASSWORD
    // ========================================================
    ipcMain.handle('auth:change-password', withAuthDb(async (event, data) => {
      try {
        if (!statementsModule.stmtGetUserByIdWithStatus || !statementsModule.stmtUpdateUserPassword) {
          return { success: false, error: 'Service de base de données non disponible' };
        }

        const userId = Number(data?.userId);
        const oldPassword = data?.oldPassword;
        const newPassword = data?.newPassword;

        if (isNaN(userId) || userId <= 0) {
          return { success: false, error: 'ID utilisateur invalide' };
        }
        if (!oldPassword || typeof oldPassword !== 'string') {
          return { success: false, error: 'Ancien mot de passe requis' };
        }
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
          return { success: false, error: 'Nouveau mot de passe invalide (minimum 8 caractères)' };
        }

        const user = statementsModule.stmtGetUserByIdWithStatus.get(userId);
        if (!user) {
          return { success: false, error: 'Utilisateur non trouvé' };
        }

        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) {
          return { success: false, error: 'Ancien mot de passe incorrect' };
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        if (!hashedPassword) {
          return { success: false, error: 'Erreur lors du hashage' };
        }

        statementsModule.stmtUpdateUserPassword.run(hashedPassword, userId);
        
        if (statementsModule.stmtDeleteSessionsByUser) {
          statementsModule.stmtDeleteSessionsByUser.run(userId);
        }

        logSecurityEvent(user.email, 'password_changed', '127.0.0.1', 'Electron', 1);

        return { success: true, message: 'Mot de passe changé avec succès' };
      } catch (err) {
        error('❌ [auth:change-password] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: GENERATE 2FA
    // ========================================================
    ipcMain.handle('auth:generate-2fa', withAuthDb(async (event, email) => {
      try {
        const normalizedEmail = normalizeEmail(email);
        const secret = speakeasy.generateSecret({
          name: `${TWO_FACTOR_APP_NAME}:${normalizedEmail}`,
          length: 20
        });
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);
        return {
          success: true,
          secret: secret.base32,
          qrCode,
          otpauthUrl: secret.otpauth_url
        };
      } catch (err) {
        error('❌ [auth:generate-2fa] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: VERIFY 2FA
    // ========================================================
    ipcMain.handle('auth:verify-2fa', withAuthDb(async (event, userId, secret, token) => {
      try {
        const verified = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token,
          window: TWO_FACTOR_WINDOW
        });

        if (verified) {
          if (statementsModule.stmtUpdateUser2FA) {
            statementsModule.stmtUpdateUser2FA.run(secret, userId);
          }
        }

        return { success: verified };
      } catch (err) {
        error('❌ [auth:verify-2fa] Erreur:', err.message);
        return { success: false };
      }
    }));

    // ========================================================
    // AUTH: DISABLE 2FA
    // ========================================================
    ipcMain.handle('auth:disable-2fa', withAuthDb(async (event, userId) => {
      try {
        if (statementsModule.stmtUpdateUser2FADisable) {
          statementsModule.stmtUpdateUser2FADisable.run(userId);
        }
        return { success: true };
      } catch (err) {
        error('❌ [auth:disable-2fa] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: VERIFY 2FA LOGIN
    // ========================================================
    ipcMain.handle('auth:verify-2fa-login', withAuthDb(async (event, userId, token) => {
      try {
        if (!statementsModule.stmtGetUserById) {
          return { success: false, error: 'Service de base de données non disponible' };
        }

        const user = statementsModule.stmtGetUserById.get(userId);
        if (!user || !user.twoFactorSecret) {
          return { success: false, error: '2FA non configuré' };
        }

        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token,
          window: TWO_FACTOR_WINDOW
        });

        if (!verified) {
          return { success: false, error: 'Code 2FA invalide' };
        }

        const jwtToken = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
        if (statementsModule.stmtInsertSession) {
          statementsModule.stmtInsertSession.run(jwtToken, user.id, expiresAt.toISOString(), new Date().toISOString());
        }

        logSecurityEvent(user.email, '2fa_login_success', '127.0.0.1', 'Electron', 1);

        return {
          success: true,
          token: jwtToken,
          user: normalizeUserData(user)
        };
      } catch (err) {
        error('❌ [auth:verify-2fa-login] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: RESET PASSWORD
    // ========================================================
    ipcMain.handle('auth:reset-password', withAuthDb(async (event, email, newPassword) => {
      try {
        if (!statementsModule.stmtGetUserByEmail || !statementsModule.stmtUpdateUserPassword) {
          return { success: false, error: 'Service de base de données non disponible' };
        }

        const normalizedEmail = normalizeEmail(email);
        const user = statementsModule.stmtGetUserByEmail.get(normalizedEmail);

        if (!user) {
          return { success: false, error: 'Utilisateur non trouvé' };
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        statementsModule.stmtUpdateUserPassword.run(hashedPassword, user.id);
        
        if (statementsModule.stmtDeleteSessionsByUser) {
          statementsModule.stmtDeleteSessionsByUser.run(user.id);
        }

        logSecurityEvent(normalizedEmail, 'password_reset', '127.0.0.1', 'Electron', 1);

        return { success: true, message: 'Mot de passe réinitialisé avec succès' };
      } catch (err) {
        error('❌ [auth:reset-password] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: REHASH PASSWORD
    // ========================================================
    ipcMain.handle('auth:rehash-password', withAuthDb(async (event, email, newPassword) => {
      try {
        if (!statementsModule.stmtGetUserByEmail || !statementsModule.stmtUpdateUserPassword) {
          return { success: false, error: 'Service de base de données non disponible' };
        }

        const user = statementsModule.stmtGetUserByEmail.get(email);
        if (!user) {
          return { success: false, error: 'Utilisateur non trouvé' };
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hash = await bcrypt.hash(newPassword, salt);

        statementsModule.stmtUpdateUserPassword.run(hash, user.id);

        const testVerify = await bcrypt.compare(newPassword, hash);

        return { success: true, hash, verified: testVerify };
      } catch (err) {
        error('❌ [auth:rehash-password] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: GET SESSIONS
    // ========================================================
    ipcMain.handle('auth:get-sessions', withAuthDb(async (event, userId) => {
      try {
        if (!statementsModule.stmtGetSessionsByUser) {
          return { success: false, error: 'Service de base de données non disponible' };
        }
        const sessions = statementsModule.stmtGetSessionsByUser.all(userId);
        return { success: true, sessions };
      } catch (err) {
        error('❌ [auth:get-sessions] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: REVOKE SESSION
    // ========================================================
    ipcMain.handle('auth:revoke-session', withAuthDb(async (event, token) => {
      try {
        if (!statementsModule.stmtDeleteSession) {
          return { success: false, error: 'Service de base de données non disponible' };
        }
        statementsModule.stmtDeleteSession.run(token);
        return { success: true };
      } catch (err) {
        error('❌ [auth:revoke-session] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: REVOKE ALL SESSIONS
    // ========================================================
    ipcMain.handle('auth:revoke-all-sessions', withAuthDb(async (event, userId) => {
      try {
        if (!statementsModule.stmtDeleteSessionsByUser) {
          return { success: false, error: 'Service de base de données non disponible' };
        }
        statementsModule.stmtDeleteSessionsByUser.run(userId);
        return { success: true };
      } catch (err) {
        error('❌ [auth:revoke-all-sessions] Erreur:', err.message);
        return { success: false, error: err.message };
      }
    }));

    // ========================================================
    // AUTH: CHECK USER EXISTS
    // ========================================================
    ipcMain.handle('auth:check-user-exists', withAuthDb(async (event, email) => {
      try {
        if (!statementsModule.stmtGetUserByEmail) {
          return null;
        }
        const normalizedEmail = normalizeEmail(email);
        const user = statementsModule.stmtGetUserByEmail.get(normalizedEmail);
        return user ? normalizeUserData(user) : null;
      } catch (err) {
        error('❌ [auth:check-user-exists] Erreur:', err.message);
        return null;
      }
    }));

    // ========================================================
    // AUTH: GET USER
    // ========================================================
    ipcMain.handle('auth:get-user', withAuthDb(async (event, userId) => {
      try {
        if (!statementsModule.stmtGetUserById) {
          return null;
        }
        const user = statementsModule.stmtGetUserById.get(userId);
        return user ? normalizeUserData(user) : null;
      } catch (err) {
        error('❌ [auth:get-user] Erreur:', err.message);
        return null;
      }
    }));

    // ========================================================
    // VÉRIFICATION FINALE
    // ========================================================
    log('📋 [auth.handlers] Vérification handlers:');
    for (const channel of channels) {
      log(`   - ${channel}: enregistré`);
    }

    log('🔐 ==========================================');
    log('✅ Auth handlers enregistrés (withAuthDb + auto-forceReconnect + re-prepare)');
    log('🔐 ==========================================');

    return true;
  } catch (err) {
    error('❌ [auth.handlers] ERREUR ENREGISTREMENT:', err.message);
    if (err.stack) error('❌ [auth.handlers] STACK:', err.stack);
    return false;
  }
}

module.exports = { registerAuthHandlers };