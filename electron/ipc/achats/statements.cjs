// electron/ipc/achats/statements.cjs — ACHATS STATEMENTS
// ⭐ FIX: Re-prepare automatique rehefa vaovao ny db instance
'use strict';

const { getDb } = require('../../database/connection.cjs');
const { log, error } = require('./utils.cjs');

let stmtGetById = null;
let stmtCreate = null;
let stmtUpdate = null;
let stmtDelete = null;
let stmtGetDetails = null;
let stmtInsertDetail = null;
let stmtDeleteDetails = null;
let stmtCheckProduit = null;
let stmtCountProduits = null;
let stmtGetStats = null;
let stmtGetStatsWithDates = null;
let stmtUpdatePaiement = null;
let stmtGetAllMinimal = null;

// ⭐ VAOVAO: Track ny db instance
let lastPreparedDb = null;

function prepareStatements(force = false) {
  try {
    const db = getDb();
    if (!db || !db.open) {
      error('❌ [achats.statements] DB indisponible');
      lastPreparedDb = null;
      return false;
    }

    // ⭐ FIX: Skip raha mitovy ny db instance ary efa vonona
    if (!force && lastPreparedDb === db && stmtGetById && stmtCreate) {
      return true;
    }

    log('🔄 [achats.statements] Re-préparation...');

    const achatsColumns = db.prepare(`PRAGMA table_info(achats)`).all();
    const achatsColumnNames = achatsColumns.map(column => column.name);

    if (!achatsColumnNames.includes('mode_paiement')) {
      db.exec(`ALTER TABLE achats ADD COLUMN mode_paiement TEXT DEFAULT 'Espèces'`);
    }
    if (!achatsColumnNames.includes('modalite_paiement')) {
      db.exec(`ALTER TABLE achats ADD COLUMN modalite_paiement TEXT DEFAULT 'Immediat'`);
    }
    if (!achatsColumnNames.includes('frais_livraison')) {
      db.exec(`ALTER TABLE achats ADD COLUMN frais_livraison REAL DEFAULT 0`);
    }
    if (!achatsColumnNames.includes('observation')) {
      db.exec(`ALTER TABLE achats ADD COLUMN observation TEXT`);
    }

    const requiredColumns = ['fournisseur_id', 'date_achat', 'total_ht', 'total_ttc', 'statut_paiement', 'montant_paye', 'montant_restant'];
    const missingRequired = requiredColumns.filter(column => !achatsColumnNames.includes(column));
    if (missingRequired.length > 0) {
      error(`❌ [achats.statements] Colonnes obligatoires manquantes: ${missingRequired.join(', ')}`);
      lastPreparedDb = null;
      return false;
    }

    stmtCreate = db.prepare(`
      INSERT INTO achats (fournisseur_id, reference, date_achat, total_ht, total_ttc, designation, nombre_produits, statut_paiement, montant_paye, montant_restant, observation, mode_paiement, modalite_paiement, frais_livraison)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmtUpdate = db.prepare(`
      UPDATE achats
      SET fournisseur_id = ?, reference = ?, date_achat = ?, total_ht = ?, total_ttc = ?,
        designation = ?, nombre_produits = ?, statut_paiement = ?, montant_paye = ?,
        montant_restant = ?, observation = ?, mode_paiement = ?, modalite_paiement = ?, frais_livraison = ?
      WHERE id = ?
    `);

    stmtGetById = db.prepare(`
      SELECT a.id, a.reference, a.fournisseur_id, a.date_achat, a.total_ht, a.total_ttc,
        a.designation, a.nombre_produits, a.statut_paiement, a.montant_paye, a.montant_restant,
        a.observation, a.mode_paiement, a.modalite_paiement, a.frais_livraison,
        a.created_at, COALESCE(a.updated_at, a.created_at) AS updated_at,
        COALESCE(f.nom, 'Aucun fournisseur') AS fournisseur_nom
      FROM achats a
      LEFT JOIN fournisseurs f ON f.id = a.fournisseur_id
      WHERE a.id = ?
    `);

    stmtDelete = db.prepare(`DELETE FROM achats WHERE id = ?`);

    stmtInsertDetail = db.prepare(`
      INSERT INTO details_achats (achat_id, produit_id, quantite, prix_unitaire, total, tva_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmtDeleteDetails = db.prepare(`DELETE FROM details_achats WHERE achat_id = ?`);

    stmtCheckProduit = db.prepare(`
      SELECT id, nom, quantite_stock, prix_achat, tva_rate, unite FROM produits WHERE id = ?
    `);

    stmtGetDetails = db.prepare(`
      SELECT d.id, d.achat_id, d.produit_id, d.quantite, d.prix_unitaire, d.total, d.tva_rate,
        p.nom AS produit_nom,
        p.code AS produit_code,
        p.unite AS unite
      FROM details_achats d
      LEFT JOIN produits p ON p.id = d.produit_id
      WHERE d.achat_id = ?
      ORDER BY d.id ASC
    `);

    stmtCountProduits = db.prepare(`SELECT COUNT(*) AS total FROM details_achats WHERE achat_id = ?`);

    stmtUpdatePaiement = db.prepare(`
      UPDATE achats
      SET statut_paiement = ?, montant_paye = ?, montant_restant = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmtGetStats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(a.total_ttc), 0) AS total_montant,
        COALESCE(SUM(a.montant_paye), 0) AS total_paye,
        COALESCE(SUM(COALESCE(a.montant_restant, a.total_ttc - COALESCE(a.montant_paye, 0))), 0) AS total_reste,
        COALESCE(SUM(COALESCE(a.nombre_produits, 0)), 0) AS total_produits,
        COUNT(DISTINCT CASE WHEN a.fournisseur_id IS NOT NULL THEN a.fournisseur_id END) AS total_fournisseurs,
        COALESCE(SUM(CASE WHEN COALESCE(a.montant_paye, 0) <= 0 THEN 1 ELSE 0 END), 0) AS non_payes,
        COALESCE(SUM(CASE WHEN COALESCE(a.montant_paye, 0) >= COALESCE(a.total_ttc, 0) AND COALESCE(a.total_ttc, 0) > 0 THEN 1 ELSE 0 END), 0) AS payes,
        COALESCE(SUM(CASE WHEN COALESCE(a.montant_paye, 0) > 0 AND COALESCE(a.montant_paye, 0) < COALESCE(a.total_ttc, 0) THEN 1 ELSE 0 END), 0) AS partiels
      FROM achats a
    `);

    stmtGetStatsWithDates = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(a.total_ttc), 0) AS total_montant,
        COALESCE(SUM(a.montant_paye), 0) AS total_paye,
        COALESCE(SUM(COALESCE(a.montant_restant, a.total_ttc - COALESCE(a.montant_paye, 0))), 0) AS total_reste,
        COALESCE(SUM(COALESCE(a.nombre_produits, 0)), 0) AS total_produits,
        COUNT(DISTINCT CASE WHEN a.fournisseur_id IS NOT NULL THEN a.fournisseur_id END) AS total_fournisseurs,
        COALESCE(SUM(CASE WHEN COALESCE(a.montant_paye, 0) <= 0 THEN 1 ELSE 0 END), 0) AS non_payes,
        COALESCE(SUM(CASE WHEN COALESCE(a.montant_paye, 0) >= COALESCE(a.total_ttc, 0) AND COALESCE(a.total_ttc, 0) > 0 THEN 1 ELSE 0 END), 0) AS payes,
        COALESCE(SUM(CASE WHEN COALESCE(a.montant_paye, 0) > 0 AND COALESCE(a.montant_paye, 0) < COALESCE(a.total_ttc, 0) THEN 1 ELSE 0 END), 0) AS partiels
      FROM achats a
      WHERE substr(a.date_achat, 1, 10) >= substr(?, 1, 10)
        AND substr(a.date_achat, 1, 10) <= substr(?, 1, 10)
    `);

    stmtGetAllMinimal = db.prepare(`
      SELECT a.id, a.reference, a.fournisseur_id, a.date_achat, a.total_ht, a.total_ttc,
        a.designation, a.nombre_produits, a.statut_paiement, a.montant_paye, a.montant_restant,
        a.observation, a.mode_paiement, a.modalite_paiement, a.frais_livraison,
        a.created_at, COALESCE(f.nom, 'Aucun fournisseur') AS fournisseur_nom
      FROM achats a
      LEFT JOIN fournisseurs f ON f.id = a.fournisseur_id
      ORDER BY a.date_achat DESC, a.id DESC
    `);

    // ⭐ Tehirizo ny db instance
    lastPreparedDb = db;

    log('✅ [achats.statements] Prêts (db instance tracké)');
    return true;
  } catch (err) {
    error('❌ [achats.statements] Erreur:', err.message);
    if (err.stack) error(err.stack);
    stmtGetById = null; stmtCreate = null; stmtUpdate = null; stmtDelete = null;
    stmtGetDetails = null; stmtInsertDetail = null; stmtDeleteDetails = null;
    stmtCheckProduit = null; stmtCountProduits = null;
    stmtGetStats = null; stmtGetStatsWithDates = null;
    stmtUpdatePaiement = null; stmtGetAllMinimal = null;
    lastPreparedDb = null;
    return false;
  }
}

function getStatements() {
  return {
    stmtGetById,
    stmtCreate,
    stmtUpdate,
    stmtDelete,
    stmtGetDetails,
    stmtInsertDetail,
    stmtDeleteDetails,
    stmtCheckProduit,
    stmtCountProduits,
    stmtGetStats,
    stmtGetStatsWithDates,
    stmtUpdatePaiement,
    stmtGetAllMinimal,
  };
}

module.exports = { prepareStatements, getStatements };