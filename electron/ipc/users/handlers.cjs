// ============================================================
// electron/ipc/users.cjs - USERS HANDLERS
// ⭐ FIX: ensureStatements → auto-forceReconnect + re-prepare
// ============================================================
'use strict';

const bcrypt = require('bcryptjs');
const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { logSecurityEvent } = require('../../utils/logger.cjs');
const { log, error } = require('./logger.cjs');
const { normalizeEmail, validateEmail, validateNotEmpty, validatePassword, VALID_ROLES, VALID_STATUSES } = require('./validation.cjs');
const statementsModule = require('./statements.cjs');

const BCRYPT_SALT_ROUNDS = 12;

async function hashPassword(password) {
  if (!password) throw new Error('Mot de passe requis');
  const cleanPassword = password.trim();
  if (cleanPassword.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères');
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return await bcrypt.hash(cleanPassword, salt);
}

function logAudit(action, userId, userEmail, details = '') {
  try {
    const db = getDb();
    if (!db || !db.open) return;
    const stmt = db.prepare(`INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at) VALUES (?, 'utilisateur', ?, ?, ?, ?, datetime('now'))`);
    stmt.run(action, userId, userEmail, userId, details);
  } catch (_) { /* ignore */ }
}

function safeGetAll() { return statementsModule.statementsReady && statementsModule.stmtGetAll ? statementsModule.stmtGetAll.all() : []; }
function safeGetById(id) { return statementsModule.statementsReady && statementsModule.stmtGetById ? statementsModule.stmtGetById.get(id) : null; }
function safeGetByIdForUpdate(id) { return statementsModule.statementsReady && statementsModule.stmtGetByIdForUpdate ? statementsModule.stmtGetByIdForUpdate.get(id) : null; }
function safeGetByEmail(email) { return statementsModule.statementsReady && statementsModule.stmtGetByEmail ? statementsModule.stmtGetByEmail.get(email) : null; }
function safeGetByEmailForCheck(email) { return statementsModule.statementsReady && statementsModule.stmtGetByEmailForCheck ? statementsModule.stmtGetByEmailForCheck.get(email) : null; }
function safeGetByEmailExcept(email, id) { return statementsModule.statementsReady && statementsModule.stmtGetByEmailExcept ? statementsModule.stmtGetByEmailExcept.get(email, id) : null; }
function safeGetStats() { return statementsModule.statementsReady && statementsModule.stmtGetStats ? statementsModule.stmtGetStats.get() : { total: 0, active: 0, admins: 0 }; }
function safeInsert(params) {
  if (!statementsModule.statementsReady || !statementsModule.stmtInsert) {
    console.error('❌ [users] Statements not ready ou stmtInsert null!');
    return { lastInsertRowid: null, changes: 0, error: 'Erreur interne: base de données non initialisée' };
  }
  try {
    const result = statementsModule.stmtInsert.run(...params);
    return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
  } catch (err) {
    console.error('❌ [users] Erreur INSERT:', err.message);
    return { lastInsertRowid: null, changes: 0, error: err.message };
  }
}
function safeUpdate(params) {
  if (!statementsModule.statementsReady || !statementsModule.stmtUpdate) {
    console.error('❌ [users] Statements not ready ou stmtUpdate null!');
    return { changes: 0, error: 'Erreur interne: base de données non initialisée' };
  }
  try {
    const result = statementsModule.stmtUpdate.run(...params);
    return { changes: result.changes };
  } catch (err) {
    console.error('❌ [users] Erreur UPDATE:', err.message);
    return { changes: 0, error: err.message };
  }
}
function safeDeleteSessions(userId) { return statementsModule.statementsReady && statementsModule.stmtDeleteSessions ? statementsModule.stmtDeleteSessions.run(userId) : { changes: 0 }; }
function safeDeleteUser(userId) { return statementsModule.statementsReady && statementsModule.stmtDeleteUser ? statementsModule.stmtDeleteUser.run(userId) : { changes: 0 }; }
function safeUpdateStatus(userId, status) { return statementsModule.statementsReady && statementsModule.stmtUpdateStatus ? statementsModule.stmtUpdateStatus.run(status, userId) : { changes: 0 }; }

// ⭐⭐⭐ ensureStatements — auto-reconnect + prepare ⭐⭐⭐
function ensureStatements() {
  try {
    // ⭐ FIX: Raha tsy misokatra ny DB, manandrana forceReconnect
    let db = getDb();
    if (!db || !db.open) {
      console.warn('⚠️ [users] DB closed! Trying forceReconnect...');
      try {
        db = forceReconnect();
      } catch (reconnectErr) {
        error('❌ [users] forceReconnect failed:', reconnectErr?.message);
      }
    }

    if (!db || !db.open) {
      error('❌ [users] Database connection is not open après forceReconnect');
      return false;
    }

    const result = statementsModule.prepareStatements();
    if (!result) error('❌ [users] prepareStatements a échoué');
    return result;
  } catch (err) {
    error('❌ [users] ensureStatements:', err.message);
    return false;
  }
}

function registerUsersHandlers(ipcMain) {
  log('👥 ==========================================');
  log('👥 [users.handlers] ENREGISTREMENT HANDLERS USERS');
  log('👥 ==========================================');
  if (!ipcMain) { error('❌ ipcMain est null/undefined!'); return false; }

  try { statementsModule.prepareStatements(); } catch (err) { error('❌ [users] Erreur prepareStatements:', err.message); }

  const channels = ['users:get-all','users:get-by-id','users:get-by-email','users:create','users:update','users:delete','users:stats'];
  for (const ch of channels) try { ipcMain.removeHandler(ch); } catch (_) {}

  ipcMain.handle('users:get-all', () => {
    try { ensureStatements(); return { success: true, data: safeGetAll() }; }
    catch (err) { error('❌ [users:get-all] Erreur:', err.message); return { success: false, error: err.message }; }
  });

  ipcMain.handle('users:get-by-id', (event, id) => {
    try {
      ensureStatements();
      if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID invalide' };
      const user = safeGetById(parseInt(id));
      if (!user) return { success: false, error: 'Utilisateur non trouvé' };
      return { success: true, data: user };
    } catch (err) { error('❌ [users:get-by-id] Erreur:', err.message); return { success: false, error: err.message }; }
  });

  ipcMain.handle('users:get-by-email', (event, email) => {
    try {
      ensureStatements();
      if (!email?.trim()) return { success: false, error: 'Email requis' };
      const normalizedEmail = normalizeEmail(email);
      const user = safeGetByEmail(normalizedEmail);
      if (!user) return { success: false, error: 'Utilisateur non trouvé' };
      return { success: true, data: user };
    } catch (err) { error('❌ [users:get-by-email] Erreur:', err.message); return { success: false, error: err.message }; }
  });

  ipcMain.handle('users:create', async (event, data) => {
    try {
      log('📝 [users:create] Données reçues');
      const { email, password, firstName, lastName, role, companyName, phone } = data;
      if (!validateEmail(email)) return { success: false, error: "Format d'email invalide" };
      const pwdValidation = validatePassword(password); if (!pwdValidation.valid) return { success: false, error: pwdValidation.message };
      if (!validateNotEmpty(firstName)) return { success: false, error: 'Prénom requis' };
      if (!validateNotEmpty(lastName)) return { success: false, error: 'Nom requis' };
      if (!validateNotEmpty(companyName)) return { success: false, error: "Nom de l'entreprise requis" };
      const normalizedEmail = normalizeEmail(email);
      const cleanPassword = pwdValidation.trimmed || password.trim();
      if (!ensureStatements()) return { success: false, error: 'Erreur interne: base de données non initialisée' };
      const existing = safeGetByEmailForCheck(normalizedEmail);
      if (existing) return { success: false, error: 'Cet email est déjà utilisé' };
      const hashedPassword = await hashPassword(cleanPassword);
      if (!hashedPassword || hashedPassword.length !== 60) return { success: false, error: 'Erreur lors du hashage' };
      const result = safeInsert([normalizedEmail, hashedPassword, firstName?.trim() || '', lastName?.trim() || '', role || 'user', companyName?.trim() || '', phone?.trim() || '']);
      if (!result || !result.lastInsertRowid) return { success: false, error: result.error || 'Échec de la création du compte' };
      const userId = result.lastInsertRowid;
      const db = getDb();
      const checkStmt = db.prepare('SELECT id, email FROM utilisateurs WHERE id = ?');
      const newUser = checkStmt.get(userId);
      if (!newUser) return { success: false, error: 'Erreur lors de la création du compte' };
      logAudit('user_created', userId, normalizedEmail);
      try { await logSecurityEvent(normalizedEmail, 'user_created', '127.0.0.1', 'Electron', 1, `ID: ${userId}`); } catch (_) {}
      log(`✅ Utilisateur créé: ${normalizedEmail} (ID: ${userId})`);
      return { success: true, data: { id: userId } };
    } catch (err) { error('❌ [users:create] Erreur:', err.message); return { success: false, error: err.message }; }
  });

  ipcMain.handle('users:update', async (event, id, data) => {
    try {
      if (!ensureStatements()) return { success: false, error: 'Erreur interne: base de données non initialisée' };
      if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID invalide' };
      const userId = parseInt(id);
      const existing = safeGetByIdForUpdate(userId);
      if (!existing) return { success: false, error: 'Utilisateur non trouvé' };
      if (!existing.password) { error(`❌ [users:update] Password existant manquant pour user ${userId}`); return { success: false, error: 'Mot de passe actuel introuvable' }; }
      const { email, firstName, lastName, role, companyName, phone, status, image, password } = data || {};
      const newEmail = email !== undefined ? normalizeEmail(email) : existing.email;
      if (email !== undefined && !validateEmail(newEmail)) return { success: false, error: "Format d'email invalide" };
      if (email !== undefined) { const duplicate = safeGetByEmailExcept(newEmail, userId); if (duplicate) return { success: false, error: 'Cet email est déjà utilisé par un autre utilisateur' }; }
      const newFirstName = firstName !== undefined ? String(firstName).trim() : existing.firstName;
      const newLastName = lastName !== undefined ? String(lastName).trim() : existing.lastName;
      const newRole = role !== undefined ? role : existing.role;
      const newCompany = companyName !== undefined ? String(companyName).trim() : existing.companyName;
      const newPhone = phone !== undefined ? String(phone).trim() : existing.phone;
      const newStatus = status !== undefined ? status : (existing.status || 'actif');
      const newImage = image !== undefined ? image : existing.image;
      let finalPassword = existing.password;
      if (password !== undefined && password !== null && String(password).trim() !== '') {
        const pwdValidation = validatePassword(String(password));
        if (!pwdValidation.valid) return { success: false, error: pwdValidation.message };
        const cleanPassword = pwdValidation.trimmed;
        finalPassword = await hashPassword(cleanPassword);
        if (!finalPassword || finalPassword.length !== 60) return { success: false, error: 'Erreur hashage' };
      }
      const result = safeUpdate([newEmail, newFirstName, newLastName, newRole, newCompany, newPhone, newStatus, newImage, finalPassword, userId]);
      if (result.error) return { success: false, error: result.error };
      if (result.changes === 0) return { success: false, error: 'Aucune modification effectuée' };
      if (status && status !== 'actif') safeDeleteSessions(userId);
      logAudit('user_updated', userId, existing.email);
      try { await logSecurityEvent(existing.email, 'user_updated', '127.0.0.1', 'Electron', 1, `ID: ${userId}`); } catch (_) {}
      log(`✅ Utilisateur mis à jour: ${newEmail} (ID: ${userId})`);
      return { success: true };
    } catch (err) { error('❌ [users:update] Erreur:', err.message); return { success: false, error: err.message }; }
  });

  ipcMain.handle('users:delete', async (event, id) => {
    try {
      ensureStatements();
      if (!id || isNaN(id) || parseInt(id) <= 0) return { success: false, error: 'ID invalide' };
      const userId = parseInt(id);
      const existing = safeGetById(userId);
      if (!existing) return { success: false, error: 'Utilisateur non trouvé' };
      safeDeleteSessions(userId);
      safeDeleteUser(userId);
      logAudit('user_deleted', userId, existing.email);
      try { await logSecurityEvent(existing.email, 'user_deleted', '127.0.0.1', 'Electron', 1, `ID: ${userId}`); } catch (_) {}
      return { success: true };
    } catch (err) { error('❌ [users:delete] Erreur:', err.message); return { success: false, error: err.message }; }
  });

  ipcMain.handle('users:stats', () => {
    try {
      ensureStatements();
      const stats = safeGetStats();
      return { success: true, data: { total: stats?.total || 0, active: stats?.active || 0, admins: stats?.admins || 0 } };
    } catch (err) { error('❌ [users:stats] Erreur:', err.message); return { success: false, error: err.message }; }
  });

  const registeredEvents = ipcMain.eventNames();
  log('📋 [users.handlers] Vérification finale:');
  for (const ch of channels) log(`   - ${ch}: ${registeredEvents.includes(ch) ? '✅' : '❌'}`);
  log('👥 ==========================================');
  if (statementsModule.statementsReady) log('✅ Users handlers enregistrés');
  else log('⚠️ Users handlers enregistrés MAIS la table "utilisateurs" est introuvable.');
  log('👥 ==========================================');
  return true;
}

module.exports = { registerUsersHandlers };