// ============================================================
// electron/ipc/clients/statements.cjs
// ⭐ FIX v5: COUNT(DISTINCT co.id) ho an'ny nombre_commandes
//          (hisoroka duplicates raha misy JOIN maromaro)
// ⭐ FIX v5: stmts.stats mampiasa COUNT(DISTINCT c.id)
// ⭐ FIX v4: Re-prepare automatique rehefa vaovao ny db instance
// ============================================================

'use strict';

const { getDb } = require('../../database/connection.cjs');
const { log, error } = require('./utils.cjs');
const { buildClientsQuery, buildClientsCountQuery } = require('./queries.cjs');

const stmts = {};
let lastPreparedDb = null;

function prepareStatements(force = false) {
  try {
    const db = getDb();
    if (!db || !db.open) {
      error('❌ [clients:statements] Database non disponible');
      lastPreparedDb = null;
      return false;
    }

    // Skip raha mitovy ny db instance ary efa vonona
    if (!force && lastPreparedDb === db && stmts.getById && stmts.create) {
      return true;
    }

    log('🔄 [clients:statements] Re-préparation...');

    // ⭐⭐⭐ GET BY ID — COUNT(DISTINCT co.id) ⭐⭐⭐
    stmts.getById = db.prepare(`
      SELECT
        c.id, c.nom, c.email, c.telephone, c.adresse, c.ville, c.code_postal, c.pays, c.type, c.created_at, c.updated_at,
        COALESCE(SUM(co.total_ttc), 0) AS total_achats,
        COUNT(DISTINCT co.id) AS nombre_commandes
      FROM clients c
      LEFT JOIN commandes co ON co.client_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
      LIMIT 1
    `);

    stmts.getByEmail = db.prepare(`SELECT id, nom, email FROM clients WHERE email = ? AND email IS NOT NULL LIMIT 1`);
    stmts.getByType = db.prepare(`SELECT id, nom, email, telephone FROM clients WHERE type = ? ORDER BY id DESC LIMIT 100`);

    stmts.create = db.prepare(`INSERT INTO clients (nom, email, telephone, adresse, ville, code_postal, pays, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    stmts.update = db.prepare(`UPDATE clients SET nom = ?, email = ?, telephone = ?, adresse = ?, ville = ?, code_postal = ?, pays = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmts.delete = db.prepare(`DELETE FROM clients WHERE id = ?`);
    stmts.checkEmail = db.prepare(`SELECT id FROM clients WHERE email = ? AND email IS NOT NULL LIMIT 1`);
    stmts.checkEmailExcept = db.prepare(`SELECT id FROM clients WHERE email = ? AND email IS NOT NULL AND id != ? LIMIT 1`);

    // ⭐⭐⭐ SEARCH — COUNT(DISTINCT co.id) ⭐⭐⭐
    stmts.search = db.prepare(`
      SELECT
        c.id, c.nom, c.email, c.telephone, c.adresse, c.ville, c.code_postal, c.pays, c.type, c.created_at,
        COALESCE(SUM(co.total_ttc), 0) AS total_achats,
        COUNT(DISTINCT co.id) AS nombre_commandes
      FROM clients c
      LEFT JOIN commandes co ON co.client_id = c.id
      WHERE c.nom LIKE ? OR c.email LIKE ? OR c.telephone LIKE ? OR c.ville LIKE ?
      GROUP BY c.id
      ORDER BY c.nom ASC, c.id ASC
      LIMIT 50
    `);

    // ⭐⭐⭐ STATS — COUNT(DISTINCT c.id) mba tsy hisy duplicates ⭐⭐⭐
    // Tsy mampiasa JOIN intsony — ny total_achats dia alaina avy amin'ny query hafa
    stmts.stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) AS total,
        COUNT(DISTINCT CASE WHEN c.type = 'Particulier' THEN c.id END) AS particuliers,
        COUNT(DISTINCT CASE WHEN c.type = 'Entreprise' THEN c.id END) AS entreprises,
        COUNT(DISTINCT c.ville) AS villes,
        COUNT(DISTINCT CASE WHEN c.telephone IS NOT NULL AND TRIM(c.telephone) != '' THEN c.id END) AS avec_telephone
      FROM clients c
    `);

    if (!stmts.create || !stmts.getById || !stmts.checkEmail) {
      error('❌ [clients:statements] Statements essentiels manquants');
      lastPreparedDb = null;
      return false;
    }

    lastPreparedDb = db;
    log('✅ [clients:statements] Statements OK (COUNT DISTINCT — tsy misy duplicates)');
    return true;
  } catch (err) {
    error('❌ [clients:statements] Erreur:', err.message);
    lastPreparedDb = null;
    return false;
  }
}

function getStatements() { return stmts; }

module.exports = { prepareStatements, getStatements, buildClientsQuery, buildClientsCountQuery };