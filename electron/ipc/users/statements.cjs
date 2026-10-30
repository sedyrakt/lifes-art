// ============================================================
// electron/ipc/users/statements.cjs
// ⭐ FIX: Re-prepare automatique rehefa vaovao ny db instance
// ============================================================
'use strict';

const { getDb } = require('../../database/connection.cjs');
const { log, error } = require('../../database/utils.cjs');

let stmtGetAll = null;
let stmtGetById = null;
let stmtGetByIdForUpdate = null;
let stmtGetByEmail = null;
let stmtGetByEmailForCheck = null;
let stmtGetByEmailExcept = null;
let stmtGetStats = null;
let stmtInsert = null;
let stmtUpdate = null;
let stmtDeleteSessions = null;
let stmtDeleteUser = null;
let stmtUpdateStatus = null;

let statementsReady = false;
// ⭐ VAOVAO: Track ny db instance
let lastPreparedDb = null;

function tableExists(db, tableName) {
  try {
    const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?");
    const result = stmt.get(tableName);
    return !!result;
  } catch (_) { return false; }
}

function prepareStatements(force = false) {
  const db = getDb();
  if (!db || !db.open) {
    error('❌ [users:statements] La base de données est indisponible');
    statementsReady = false;
    lastPreparedDb = null;
    return false;
  }

  // ⭐ FIX: Skip raha mitovy ny db instance ary efa vonona
  if (!force && lastPreparedDb === db && statementsReady && stmtGetById) {
    return true;
  }

  log('🔄 [users:statements] Vérification + préparation...');

  if (!tableExists(db, 'utilisateurs')) {
    log('⚠️ [users:statements] La table "utilisateurs" n\'existe pas !');
    statementsReady = false;
    lastPreparedDb = null;
    return false;
  }

  try {
    stmtGetAll = db.prepare(`
      SELECT id, email, firstName, lastName, role, companyName, phone, image,
             status, twoFactorEnabled, lastLogin, created_at, updated_at
      FROM utilisateurs ORDER BY id DESC
    `);

    stmtGetById = db.prepare(`
      SELECT id, email, firstName, lastName, role, companyName, phone, image,
             status, twoFactorEnabled, lastLogin, created_at, updated_at
      FROM utilisateurs WHERE id = ?
    `);

    stmtGetByEmail = db.prepare(`
      SELECT id, email, firstName, lastName, role, companyName, phone, image,
             status, twoFactorEnabled, lastLogin, created_at, updated_at
      FROM utilisateurs WHERE email = ?
    `);

    stmtGetByEmailForCheck = db.prepare('SELECT id FROM utilisateurs WHERE email = ?');
    stmtGetByEmailExcept = db.prepare('SELECT id FROM utilisateurs WHERE email = ? AND id != ?');

    stmtGetStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM utilisateurs) as total,
        (SELECT COUNT(*) FROM utilisateurs WHERE status = 'actif') as active,
        (SELECT COUNT(*) FROM utilisateurs WHERE role = 'admin') as admins
    `);

    stmtInsert = db.prepare(`
      INSERT INTO utilisateurs
        (email, password, firstName, lastName, role, companyName, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmtGetByIdForUpdate = db.prepare(`
      SELECT id, email, password, firstName, lastName, role, companyName, phone, image,
             status, twoFactorEnabled, lastLogin, created_at, updated_at
      FROM utilisateurs WHERE id = ?
    `);

    stmtUpdate = db.prepare(`
      UPDATE utilisateurs SET
        email = ?, firstName = ?, lastName = ?, role = ?,
        companyName = ?, phone = ?, status = ?, image = ?, password = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmtUpdateStatus = db.prepare(`
      UPDATE utilisateurs SET status = ?, updated_at = datetime('now') WHERE id = ?
    `);

    stmtDeleteSessions = db.prepare('DELETE FROM sessions WHERE userId = ?');
    stmtDeleteUser = db.prepare('DELETE FROM utilisateurs WHERE id = ?');

    if (!stmtGetAll || !stmtGetById || !stmtGetByIdForUpdate || !stmtGetByEmail ||
        !stmtGetByEmailForCheck || !stmtGetByEmailExcept || !stmtGetStats ||
        !stmtInsert || !stmtUpdate || !stmtUpdateStatus || !stmtDeleteSessions ||
        !stmtDeleteUser) {
      throw new Error('Un ou plusieurs statements n\'ont pas pu être préparés.');
    }

    statementsReady = true;
    // ⭐ Tehirizo ny db instance
    lastPreparedDb = db;
    log('✅ [users:statements] Tous les statements sont prêts (db instance tracké).');
    return true;

  } catch (err) {
    error('❌ [users:statements] Erreur lors de la préparation:', err.message);
    statementsReady = false;
    lastPreparedDb = null;
    return false;
  }
}

module.exports = {
  prepareStatements,
  get stmtGetAll() { return stmtGetAll; },
  get stmtGetById() { return stmtGetById; },
  get stmtGetByIdForUpdate() { return stmtGetByIdForUpdate; },
  get stmtGetByEmail() { return stmtGetByEmail; },
  get stmtGetByEmailForCheck() { return stmtGetByEmailForCheck; },
  get stmtGetByEmailExcept() { return stmtGetByEmailExcept; },
  get stmtGetStats() { return stmtGetStats; },
  get stmtInsert() { return stmtInsert; },
  get stmtUpdate() { return stmtUpdate; },
  get stmtDeleteSessions() { return stmtDeleteSessions; },
  get stmtDeleteUser() { return stmtDeleteUser; },
  get stmtUpdateStatus() { return stmtUpdateStatus; },
  get statementsReady() { return statementsReady; },
};