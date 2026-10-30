// electron/ipc/orders/handlers.cjs
// ⭐ FIX: withDb → auto-forceReconnect (mifanaraka amin'ny modules hafa)
// ⭐ FIX: Re-prepare statements isaky ny request (idempotent)
// ⭐ FIX: Nesorina ny `statementsRef` stale
// ⭐ NOUVEAU: orders:get-stats mandray options { startDate, endDate, search, statut, montantMin, montantMax, modePaiement }
// ⭐ FIX: buildOrdersStatsQuery — mampiasa buildOrdersFilters (search + statut + dates + montants + modePaiement)
// ⭐ FIX: computeTotalItemsFiltered ho an'ny articles vendus voafetra
// ⭐ FIX CRITIQUE: orders:update-paiement — raisina ny `statut_paiement` alefa avy amin'ny UI
//                  - Raha `montant_paye` omena → kajy ny statut (na omena explicit)
//                  - Raha `statut_paiement` ihany no omena → adjust ny montant
//                  - Raha `Payé` tsy misy montant → paye = total_ttc
//                  - Raha `Non payé` tsy misy montant → paye = 0
//                  - Raha `Partiel` tsy misy montant → tehirizo ny montant actuel
'use strict';

const { getDb, forceReconnect } = require('../../database/connection.cjs');
const { log, error } = require('../../database/utils.cjs');
const { BrowserWindow } = require('electron');
const { validateOrder, normalizePaiement, computePaiementStatus, calculatePaymentDeadline } = require('./validation.cjs');
const { buildOrdersQuery, buildOrdersCountQuery, buildOrdersFilters } = require('./queries.cjs');
const statementsModule = require('./statements.cjs');

const VALID_PAIEMENT_STATUSES = ['Payé', 'Partiel', 'Non payé'];

// ⭐⭐⭐ WRAPPER: withDb — auto-reconnect + re-prepare ⭐⭐⭐
function withDb(fn) {
  return async (event, ...args) => {
    try {
      let db = getDb();

      if (!db || !db.open) {
        console.warn('⚠️ [orders] DB connection closed! Trying forceReconnect...');
        try {
          db = forceReconnect();
        } catch (reconnectErr) {
          error('❌ [orders] forceReconnect failed:', reconnectErr?.message);
        }
      }

      if (!db || !db.open) {
        error('❌ [orders] Database connection is not open après forceReconnect');
        return { success: false, error: 'Database connection is not open' };
      }

      if (!statementsModule.prepareStatements()) {
        error('❌ [orders] Impossible de préparer les statements');
        return { success: false, error: 'Failed to prepare orders statements' };
      }

      const stmts = statementsModule.getStatements();
      if (!stmts || !stmts.stmtGetById || !stmts.stmtCreate) {
        error('❌ [orders] Statements not available');
        return { success: false, error: 'Orders statements not available' };
      }

      return await fn(db, stmts, event, ...args);
    } catch (err) {
      error('❌ [orders] withDb:', err?.message || err);
      return { success: false, error: err?.message || 'Erreur interne orders' };
    }
  };
}

function parseTvaRate(value) {
  return (value !== undefined && value !== null && value !== '') ? Number(value) : 0;
}

function emitProductsChangedDirect(data = {}) {
  try {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        try { win.webContents.send('products:changed', data); } catch (_) {}
      }
    });
  } catch (_) {}
}

function emitOrdersChanged(data = {}) {
  try {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        try { win.webContents.send('orders:changed', data); } catch (_) {}
      }
    });
  } catch (_) {}
}

function emitFinancialChanged(data = {}) {
  try {
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        try { win.webContents.send('financial:changed', data); } catch (_) {}
      }
    });
  } catch (_) {}
}

function normalizeId(value) {
  const id = Number(value);
  return (Number.isInteger(id) && id > 0) ? id : null;
}

function normalizePayment(totalTTC, montantPaye) {
  const total = Math.max(0, Number(totalTTC) || 0);
  const paye = Math.max(0, Math.min(total, Number(montantPaye) || 0));
  const restant = Math.max(0, total - paye);
  return {
    totalTTC: Number(total.toFixed(2)),
    montantPaye: Number(paye.toFixed(2)),
    montantRestant: Number(restant.toFixed(2)),
    statutPaiement: computePaiementStatus(total, paye)
  };
}

function updateProduitStatutStock(produitId) {
  try {
    const db = getDb();
    if (!db || !db.open) return;
    const produit = db.prepare(`SELECT id, quantite_stock, quantite_minimale FROM produits WHERE id = ?`).get(produitId);
    if (!produit) return;
    const stock = Number(produit.quantite_stock || 0);
    const seuil = Number(produit.quantite_minimale ?? 5);
    let statut = 'disponible';
    if (stock <= 0) statut = 'rupture';
    else if (stock <= seuil) statut = 'alerte';
    try {
      db.prepare(`UPDATE produits SET statut_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(statut, produitId);
    } catch (_) {}
  } catch (err) {
    error('❌ [orders] updateProduitStatutStock:', err.message);
  }
}

// ⭐⭐⭐ HELPERS DATE ⭐⭐⭐
function normalizeDateBoundary(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s;
}

// ⭐⭐⭐ STATS DYNAMIQUE (avec filtre période + search + statut + montants + modePaiement) ⭐⭐⭐
function buildOrdersStatsQuery(options = {}) {
  const { where, params } = buildOrdersFilters(options);

  const query = `
    SELECT COUNT(*) AS total,
      COALESCE(SUM(c.total_ttc), 0) AS total_ca,
      COALESCE(SUM(c.total_ht), 0) AS total_ht,
      COALESCE(SUM(c.montant_paye), 0) AS total_paye,
      COALESCE(AVG(c.total_ttc), 0) AS moyenne_panier,
      COUNT(DISTINCT c.client_id) AS clients_uniques,
      COALESCE(SUM(c.montant_restant), 0) AS total_dette,
      COALESCE(SUM(CASE WHEN COALESCE(c.montant_paye, 0) <= 0 THEN 1 ELSE 0 END), 0) AS nb_commandes_non_payees,
      COALESCE(SUM(CASE WHEN COALESCE(c.montant_paye, 0) >= COALESCE(c.total_ttc, 0) AND COALESCE(c.total_ttc, 0) > 0 THEN 1 ELSE 0 END), 0) AS nb_commandes_payees,
      COALESCE(SUM(CASE WHEN COALESCE(c.montant_paye, 0) > 0 AND COALESCE(c.montant_paye, 0) < COALESCE(c.total_ttc, 0) THEN 1 ELSE 0 END), 0) AS nb_commandes_partielles,
      COALESCE(SUM(CASE
        WHEN COALESCE(c.statut_paiement, 'Non payé') != 'Payé'
          AND COALESCE(c.montant_restant, 0) > 0
          AND c.date_limite_paiement IS NOT NULL
          AND TRIM(c.date_limite_paiement) != ''
          AND datetime(
            CASE
              WHEN length(TRIM(c.date_limite_paiement)) <= 10
                THEN datetime(TRIM(c.date_limite_paiement) || ' 23:59:59')
              ELSE datetime(TRIM(c.date_limite_paiement))
            END
          ) < datetime('now', 'localtime')
        THEN 1 ELSE 0
      END), 0) AS nb_commandes_en_retard
    FROM commandes c
    ${where}
  `;

  return { query, params };
}

// ⭐ FIX: Kajy ny total_items (articles vendus) miaraka amin'ny filters rehetra
function computeTotalItemsFiltered(db, options = {}) {
  try {
    const { where, params } = buildOrdersFilters(options);
    const row = db.prepare(`
      SELECT COALESCE(SUM(dc.quantite), 0) AS total_items
      FROM details_commandes dc
      INNER JOIN commandes c ON c.id = dc.commande_id
      ${where}
    `).get(...params);
    return Number(row?.total_items || 0);
  } catch (err) {
    console.error('❌ computeTotalItemsFiltered:', err?.message);
    return 0;
  }
}

function registerOrdersHandlers(ipcMain) {
  log('📦 [orders.handlers] ENREGISTREMENT HANDLERS COMMANDES');
  if (!ipcMain) { error('❌ ipcMain est null/undefined!'); return false; }

  if (!statementsModule.prepareStatements()) {
    error('❌ [orders.handlers] Statements non préparés');
    return false;
  }

  const channels = [
    'orders:get-all', 'orders:get-by-id', 'orders:create', 'orders:update',
    'orders:delete', 'orders:get-details', 'orders:get-by-client',
    'orders:get-by-status', 'orders:get-by-date-range', 'orders:get-stats',
    'orders:get-products', 'orders:update-paiement', 'orders:update-status',
    'orders:get-with-details', 'orders:get-total', 'orders:get-by-number',
    'orders:get-journalieres', 'orders:get-dette-stats',
    'orders:get-overdue'
  ];
  channels.forEach(channel => { try { ipcMain.removeHandler(channel); } catch (_) {} });

  // ═══════════════════════════════════════════════════════════
  // GET ALL
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-all', withDb((db, stmts, event, options = {}) => {
    const result = buildOrdersQuery(options || {});
    const data = db.prepare(result.query).all(result.params);
    const count = buildOrdersCountQuery(options || {});
    const countResult = db.prepare(count.query).get(count.params);
    const total = Number(countResult?.total || 0);
    return {
      success: true,
      data,
      pagination: {
        total,
        page: result.page,
        limit: result.limit,
        offset: result.offset,
        totalPages: result.limit > 0 ? Math.ceil(total / result.limit) : 0
      }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY ID
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-by-id', withDb((db, stmts, event, id) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return { success: false, error: 'ID invalide' };
    const order = stmts.stmtGetById.get(normalizedId);
    if (!order) return { success: false, error: 'Commande non trouvée' };
    order.numero = `CMD-${String(order.id).padStart(6, '0')}`;
    order.statut_paiement = normalizePaiement(order.statut_paiement) || computePaiementStatus(order.total_ttc, order.montant_paye);
    return { success: true, data: order };
  }));

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:create', withDb((db, stmts, event, data = {}) => {
    const validation = validateOrder(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };
    const validated = validation.data;

    if (validated.client_id) {
      const clientCheck = db.prepare('SELECT id FROM clients WHERE id = ?').get(validated.client_id);
      if (!clientCheck) { validated.client_id = null; validated.client_nom = 'Client'; }
    }

    for (const product of validated.products) {
      const productCheck = db.prepare('SELECT id FROM produits WHERE id = ?').get(product.id);
      if (!productCheck) return { success: false, error: `Produit ID ${product.id} introuvable.` };
    }

    const payment = normalizePayment(validated.total_ttc, validated.montant_paye);
    const requestedStatus = normalizePaiement(data.statut_paiement);
    if (requestedStatus) payment.statutPaiement = requestedStatus;

    if (!VALID_PAIEMENT_STATUSES.includes(payment.statutPaiement)) {
      return { success: false, error: 'Statut paiement invalide' };
    }

    let commandeId = null;
    const affectedProductIds = [];

    const transaction = db.transaction(() => {
      const result = stmts.stmtCreate.run(
        validated.client_id || null, validated.client_nom,
        validated.total_ht, payment.totalTTC, payment.totalTTC,
        payment.statutPaiement, payment.montantPaye, payment.montantRestant,
        validated.mode_paiement, validated.modalite_paiement, validated.frais_livraison, validated.date_limite_paiement
      );
      commandeId = Number(result.lastInsertRowid);
      if (!commandeId) throw new Error('Impossible de créer la commande');

      for (const product of validated.products) {
        const produit = stmts.stmtCheckStock.get(product.id);
        if (!produit) throw new Error(`Produit ${product.name || product.id} introuvable`);
        const qty = Number(product.quantity);
        const price = Number(product.price);
        const tvaRate = parseTvaRate(product.tva_rate);

        if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Quantité invalide pour ${product.name || product.id}`);
        if (!Number.isFinite(price) || price < 0) throw new Error(`Prix invalide pour ${product.name || product.id}`);

        const ancienStock = Number(produit.quantite_stock || 0);
        if (ancienStock < qty) throw new Error(`Stock insuffisant pour ${product.name || produit.nom}. Disponible: ${ancienStock}`);

        const nouveauStock = ancienStock - qty;
        const totalLigne = Number((qty * price).toFixed(2));

        stmts.stmtInsertDetail.run(commandeId, product.id, qty, price, totalLigne, tvaRate);

        const stockResult = stmts.stmtUpdateStock.run(qty, product.id, qty);
        if (stockResult.changes !== 1) throw new Error(`Impossible de mettre à jour le stock du produit ${product.name || product.id}`);

        stmts.stmtInsertMouvement.run(product.id, qty, ancienStock, nouveauStock, `CMD-${commandeId}`, `Sortie liée à la commande #${commandeId}`);

        affectedProductIds.push(product.id);
      }
    });

    transaction();
    affectedProductIds.forEach(updateProduitStatutStock);

    emitProductsChangedDirect({ type: 'refresh' });
    emitOrdersChanged({
      type: 'create',
      id: commandeId,
      statut_paiement: payment.statutPaiement,
      montant_paye: payment.montantPaye,
      montant_restant: payment.montantRestant
    });
    emitFinancialChanged({ type: 'order_created', id: commandeId });

    return {
      success: true,
      data: {
        id: commandeId,
        numero: `CMD-${String(commandeId).padStart(6, '0')}`,
        statut_paiement: payment.statutPaiement,
        montant_paye: payment.montantPaye,
        montant_restant: payment.montantRestant
      }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:update', withDb((db, stmts, event, id, data = {}) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return { success: false, error: 'ID invalide' };
    const existing = stmts.stmtGetById.get(normalizedId);
    if (!existing) return { success: false, error: 'Commande non trouvée' };

    const validation = validateOrder(data);
    if (!validation.valid) return { success: false, error: validation.errors.join(', ') };
    const validated = validation.data;

    if (validated.client_id) {
      const clientCheck = db.prepare('SELECT id FROM clients WHERE id = ?').get(validated.client_id);
      if (!clientCheck) { validated.client_id = null; validated.client_nom = 'Client'; }
    }

    for (const product of validated.products) {
      const productCheck = db.prepare('SELECT id FROM produits WHERE id = ?').get(product.id);
      if (!productCheck) return { success: false, error: `Produit ID ${product.id} introuvable.` };
    }

    const payment = normalizePayment(validated.total_ttc, validated.montant_paye);
    const requestedStatus = normalizePaiement(data.statut_paiement);
    if (requestedStatus) payment.statutPaiement = requestedStatus;

    const affectedProductIds = [];

    const transaction = db.transaction(() => {
      const oldDetails = stmts.stmtGetDetailsForRestore.all(normalizedId);
      for (const detail of oldDetails) {
        const produitId = Number(detail.produit_id);
        const qty = Number(detail.quantite);
        if (!produitId || !qty) continue;
        const produitAvant = stmts.stmtCheckStock.get(produitId);
        if (!produitAvant) throw new Error(`Produit ${produitId} introuvable lors de la restauration`);
        const ancienStock = Number(produitAvant.quantite_stock || 0);
        const nouveauStock = ancienStock + qty;
        stmts.stmtRestoreStock.run(qty, produitId);
        stmts.stmtInsertMouvementRestore.run(produitId, qty, ancienStock, nouveauStock, `REST-${normalizedId}`, `Restauration avant modification commande #${normalizedId}`);
        affectedProductIds.push(produitId);
      }

      db.prepare(`DELETE FROM details_commandes WHERE commande_id = ?`).run(normalizedId);

      stmts.stmtUpdate.run(
        validated.client_id || null, validated.client_nom,
        validated.total_ht, payment.totalTTC, payment.totalTTC,
        payment.statutPaiement, payment.montantPaye, payment.montantRestant,
        validated.mode_paiement, validated.modalite_paiement, validated.frais_livraison, validated.date_limite_paiement,
        normalizedId
      );

      for (const product of validated.products) {
        const qty = Number(product.quantity);
        const price = Number(product.price);
        const tvaRate = parseTvaRate(product.tva_rate);

        const produit = stmts.stmtCheckStock.get(product.id);
        if (!produit) throw new Error(`Produit ${product.name || product.id} introuvable`);
        const ancienStock = Number(produit.quantite_stock || 0);
        if (ancienStock < qty) throw new Error(`Stock insuffisant pour ${product.name || produit.nom}. Disponible: ${ancienStock}`);
        const nouveauStock = ancienStock - qty;
        const totalLigne = Number((qty * price).toFixed(2));

        stmts.stmtInsertDetail.run(normalizedId, product.id, qty, price, totalLigne, tvaRate);

        const stockResult = stmts.stmtUpdateStock.run(qty, product.id, qty);
        if (stockResult.changes !== 1) throw new Error(`Impossible de mettre à jour le stock du produit ${product.id}`);

        stmts.stmtInsertMouvement.run(product.id, qty, ancienStock, nouveauStock, `CMD-${normalizedId}`, `Sortie liée à la modification commande #${normalizedId}`);
        affectedProductIds.push(product.id);
      }
    });

    transaction();
    [...new Set(affectedProductIds)].forEach(updateProduitStatutStock);

    emitProductsChangedDirect({ type: 'refresh' });
    emitOrdersChanged({
      type: 'update',
      id: normalizedId,
      statut_paiement: payment.statutPaiement,
      montant_paye: payment.montantPaye,
      montant_restant: payment.montantRestant
    });
    emitFinancialChanged({ type: 'order_updated', id: normalizedId });

    return {
      success: true,
      data: {
        id: normalizedId,
        statut_paiement: payment.statutPaiement,
        montant_paye: payment.montantPaye,
        montant_restant: payment.montantRestant
      }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐⭐⭐ UPDATE PAIEMENT — FIX CRITIQUE ⭐⭐⭐
  // Raisina ny `statut_paiement` alefa avy amin'ny UI.
  // Priorité:
  //   1. Raha `montant_paye` omena  → kajy ny statut (na omena explicit)
  //   2. Raha `statut_paiement === 'Payé'`    → paye = total_ttc
  //   3. Raha `statut_paiement === 'Non payé'` → paye = 0
  //   4. Raha `statut_paiement === 'Partiel'`  → tehirizo ny montant actuel
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:update-paiement', withDb((db, stmts, event, id, data = {}) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return { success: false, error: 'ID invalide' };

    const order = stmts.stmtGetById.get(normalizedId);
    if (!order) return { success: false, error: 'Commande introuvable' };

    const totalTTC = Math.max(0, Number(order.total_ttc || 0));
    const requestedStatus = normalizePaiement(data?.statut_paiement);
    const hasMontantPaye = data?.montant_paye !== undefined && data?.montant_paye !== null;

    let payment;

    if (hasMontantPaye) {
      // Priority 1: raha omena ny montant_paye → kajy ny statut
      payment = normalizePayment(totalTTC, data.montant_paye);
      // Raha omena explicit koa ny statut → manaraka ilay izy
      if (requestedStatus) payment.statutPaiement = requestedStatus;
    } else if (requestedStatus === 'Payé') {
      // Priority 2: "Payé" ihany → paye = total
      payment = normalizePayment(totalTTC, totalTTC);
    } else if (requestedStatus === 'Non payé') {
      // Priority 3: "Non payé" → paye = 0
      payment = normalizePayment(totalTTC, 0);
    } else if (requestedStatus === 'Partiel') {
      // Priority 4: "Partiel" → tehirizo ny montant_paye actuel
      const currentPaye = Math.max(0, Math.min(totalTTC, Number(order.montant_paye || 0)));
      if (currentPaye > 0 && currentPaye < totalTTC) {
        payment = normalizePayment(totalTTC, currentPaye);
      } else {
        // Fallback: antsasaky ny total
        payment = normalizePayment(totalTTC, totalTTC / 2);
      }
      payment.statutPaiement = 'Partiel';
    } else {
      return { success: false, error: 'Aucune donnée de paiement valide (montant_paye ou statut_paiement requis)' };
    }

    if (!VALID_PAIEMENT_STATUSES.includes(payment.statutPaiement)) {
      return { success: false, error: 'Statut paiement invalide' };
    }

    const result = stmts.stmtUpdatePaiement.run(
      payment.statutPaiement,
      payment.montantPaye,
      payment.montantRestant,
      normalizedId
    );

    if (result.changes !== 1) return { success: false, error: 'Aucune modification du paiement' };

    emitOrdersChanged({
      type: 'update_paiement',
      id: normalizedId,
      statut_paiement: payment.statutPaiement,
      montant_paye: payment.montantPaye,
      montant_restant: payment.montantRestant
    });
    emitFinancialChanged({ type: 'payment_updated', id: normalizedId });

    return {
      success: true,
      data: {
        id: normalizedId,
        statut_paiement: payment.statutPaiement,
        montant_paye: payment.montantPaye,
        montant_restant: payment.montantRestant
      }
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:delete', withDb((db, stmts, event, id) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return { success: false, error: 'ID invalide' };
    const existing = stmts.stmtGetById.get(normalizedId);
    if (!existing) return { success: false, error: 'Commande non trouvée' };

    const affectedProductIds = [];

    const transaction = db.transaction(() => {
      const details = stmts.stmtGetDetailsForRestore.all(normalizedId);
      for (const detail of details) {
        const produitId = Number(detail.produit_id);
        const qty = Number(detail.quantite);
        if (!produitId || !qty) continue;
        const produitAvant = stmts.stmtCheckStock.get(produitId);
        if (!produitAvant) throw new Error(`Produit ${produitId} introuvable`);
        const ancienStock = Number(produitAvant.quantite_stock || 0);
        const nouveauStock = ancienStock + qty;
        stmts.stmtRestoreStock.run(qty, produitId);
        stmts.stmtInsertMouvementRestore.run(produitId, qty, ancienStock, nouveauStock, `REST-${normalizedId}`, `Restauration avant suppression commande #${normalizedId}`);
        affectedProductIds.push(produitId);
      }
      db.prepare(`DELETE FROM details_commandes WHERE commande_id = ?`).run(normalizedId);
      stmts.stmtDelete.run(normalizedId);
    });

    transaction();
    [...new Set(affectedProductIds)].forEach(updateProduitStatutStock);
    emitProductsChangedDirect({ type: 'refresh' });
    emitOrdersChanged({ type: 'delete', id: normalizedId });
    emitFinancialChanged({ type: 'order_deleted', id: normalizedId });

    return { success: true, data: { id: normalizedId } };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET DETAILS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-details', withDb((db, stmts, event, commandeId) => {
    const id = normalizeId(commandeId);
    if (!id) return { success: false, error: 'ID de commande invalide' };
    return { success: true, data: stmts.stmtGetDetails.all(id) || [] };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET PRODUCTS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-products', withDb((db, stmts, event, commandeId) => {
    const id = normalizeId(commandeId);
    if (!id) return { success: false, error: 'ID de commande invalide' };
    const commande = stmts.stmtGetById.get(id);
    if (!commande) return { success: false, error: 'Commande non trouvée' };

    const products = stmts.stmtGetProducts.all(id) || [];
    const formatted = products.map(product => ({
      id: product.produit_id,
      name: product.produit_nom || 'Produit',
      code: product.produit_code || '',
      quantity: Number(product.quantite || 0),
      price: Number(product.prix_unitaire || 0),
      total: Number(product.total_ligne || 0),
      tva_rate: parseTvaRate(product.tva_rate)
    }));
    return { success: true, data: formatted };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY CLIENT
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-by-client', withDb((db, stmts, event, clientNom) => {
    if (!clientNom || !String(clientNom).trim()) return { success: false, error: 'Nom client requis' };
    return { success: true, data: stmts.stmtGetByClient.all(`%${String(clientNom).trim()}%`) };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY STATUS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-by-status', withDb((db, stmts, event, statut) => {
    const normalized = normalizePaiement(statut);
    if (!normalized) return { success: false, error: 'Statut paiement invalide' };
    return { success: true, data: stmts.stmtGetByStatus.all(normalized) };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY DATE RANGE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-by-date-range', withDb((db, stmts, event, startDate, endDate) => {
    if (!startDate || !endDate) return { success: false, error: 'Dates requises' };
    return { success: true, data: stmts.stmtGetByDateRange.all(`${startDate} 00:00:00`, `${endDate} 23:59:59`) };
  }));

  // ═══════════════════════════════════════════════════════════
  // ⭐ GET STATS — mandray options { startDate, endDate, search, statut, montantMin, montantMax, modePaiement }
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-stats', withDb((db, stmts, event, options = {}) => {
    const startDate = options?.startDate;
    const endDate = options?.endDate;
    const search = options?.search;
    const statut = options?.statut;
    const montantMin = options?.montantMin;
    const montantMax = options?.montantMax;
    const modePaiement = options?.modePaiement;

    const hasStatutFilter = statut && statut !== 'Tous';
    const hasFilter = Boolean(
      startDate || endDate || search || hasStatutFilter ||
      montantMin || montantMax || modePaiement
    );

    const filterOptions = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      statutPaiement: hasStatutFilter ? statut : undefined,
      montantMin: montantMin || undefined,
      montantMax: montantMax || undefined,
      modePaiement: modePaiement || undefined,
    };

    let data;
    let totalItems = 0;

    if (hasFilter) {
      const { query, params } = buildOrdersStatsQuery(filterOptions);
      data = db.prepare(query).get(...params) || {};
      totalItems = computeTotalItemsFiltered(db, filterOptions);
    } else {
      data = stmts.stmtGetStats.get() || {};
      totalItems = Number(data.total_items || 0);
    }

    return {
      success: true,
      data: {
        total: Number(data.total || 0),
        totalCA: Number(data.total_ca || 0),
        totalHT: Number(data.total_ht || 0),
        totalPaye: Number(data.total_paye || 0),
        totalDette: Number(data.total_dette || 0),
        nbCommandesNonPayees: Number(data.nb_commandes_non_payees || 0),
        nbCommandesPayees: Number(data.nb_commandes_payees || 0),
        nbCommandesPartielles: Number(data.nb_commandes_partielles || 0),
        nbCommandesEnRetard: Number(data.nb_commandes_en_retard || 0),
        moyennePanier: Number(data.moyenne_panier || 0),
        clientsUniques: Number(data.clients_uniques || 0),
        totalItems,
        // Aliases snake_case
        total_ca: Number(data.total_ca || 0),
        total_ht: Number(data.total_ht || 0),
        total_paye: Number(data.total_paye || 0),
        total_dette: Number(data.total_dette || 0),
        nb_commandes_non_payees: Number(data.nb_commandes_non_payees || 0),
        // Meta
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET DETTE STATS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-dette-stats', withDb((db, stmts) => {
    const data = stmts.stmtGetDetteStats.get();
    return { success: true, data: data || { total_dette: 0, nb_commandes_non_payees: 0 } };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET OVERDUE
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-overdue', withDb((db, stmts) => {
    if (!stmts.stmtGetOverdue) {
      return { success: true, data: [], count: 0, total_dette: 0 };
    }

    const rows = stmts.stmtGetOverdue.all() || [];

    const data = rows.map((row) => ({
      ...row,
      late_seconds: Number(row.late_seconds || 0),
      montant_restant: Number(row.montant_restant || 0),
      montant_paye: Number(row.montant_paye || 0),
      total_ttc: Number(row.total_ttc || 0),
    }));

    const totalDette = data.reduce((sum, r) => sum + Math.max(0, r.montant_restant), 0);

    return {
      success: true,
      data,
      count: data.length,
      total_dette: Number(totalDette.toFixed(2)),
    };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET TOTAL
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-total', withDb((db, stmts, event, commandeId) => {
    const id = normalizeId(commandeId);
    if (!id) return { success: false, error: 'ID de commande invalide' };
    const result = stmts.stmtGetTotal.get(id);
    if (!result) return { success: false, error: 'Commande introuvable' };
    return { success: true, data: { total_ht: Number(result.total_ht || 0), total_ttc: Number(result.total_ttc || 0) } };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET BY NUMBER
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-by-number', withDb((db, stmts, event, numero) => {
    const value = String(numero || '').trim();
    const match = value.match(/CMD-(\d+)/i);
    if (!match) return { success: false, error: 'Numéro de commande invalide' };
    const id = normalizeId(parseInt(match[1], 10));
    if (!id) return { success: false, error: 'Numéro de commande invalide' };

    const order = stmts.stmtGetById.get(id);
    if (order) {
      order.numero = `CMD-${String(order.id).padStart(6, '0')}`;
      order.statut_paiement = normalizePaiement(order.statut_paiement) || computePaiementStatus(order.total_ttc, order.montant_paye);
    }
    return { success: true, data: order || null };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET WITH DETAILS
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-with-details', withDb((db, stmts, event, commandeId) => {
    const id = normalizeId(commandeId);
    if (!id) return { success: false, error: 'ID de commande invalide' };
    const commande = stmts.stmtGetById.get(id);
    if (!commande) return { success: false, error: 'Commande non trouvée' };

    const details = stmts.stmtGetDetails.all(id) || [];
    commande.numero = `CMD-${String(commande.id).padStart(6, '0')}`;
    commande.statut_paiement = normalizePaiement(commande.statut_paiement) || computePaiementStatus(commande.total_ttc, commande.montant_paye);

    const products = details.map(detail => ({
      id: detail.produit_id,
      name: detail.produit_nom || 'Produit',
      code: detail.produit_code || '',
      quantity: Number(detail.quantite || 0),
      price: Number(detail.prix_unitaire || 0),
      total: Number(detail.total || 0),
      tva_rate: parseTvaRate(detail.tva_rate)
    }));

    if (!commande.client_telephone && commande.client_id) {
      try {
        const client = db.prepare('SELECT telephone FROM clients WHERE id = ?').get(commande.client_id);
        commande.client_telephone = client?.telephone || '';
      } catch (_) {}
    }

    return { success: true, data: { ...commande, products, details } };
  }));

  // ═══════════════════════════════════════════════════════════
  // GET JOURNALIERES
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:get-journalieres', withDb((db, stmts, event, options = {}) => {
    const startDate = options?.startDate;
    const endDate = options?.endDate;
    if (startDate && endDate) {
      return { success: true, data: stmts.stmtGetJournalieres.all(`${startDate} 00:00:00`, `${endDate} 23:59:59`) };
    }
    const data = stmts.stmtGetJournalieres.all('1970-01-01 00:00:00', '2999-12-31 23:59:59');
    return { success: true, data: Array.isArray(data) ? data.slice(0, 30) : [] };
  }));

  // ═══════════════════════════════════════════════════════════
  // UPDATE STATUS (deprecated)
  // ═══════════════════════════════════════════════════════════
  ipcMain.handle('orders:update-status', async (event, id, statut) => {
    return { success: false, error: 'Les anciens statuts de commande sont supprimés. Utilisez le statut de paiement : Payé, Partiel ou Non payé.' };
  });

  log('✅ [orders.handlers] Enregistrés (withDb + auto-forceReconnect + re-prepare)');
  log('💳 Statuts paiement actifs: Payé | Partiel | Non payé');
  log('🚚 Frais de livraison inclus!');
  log('⏰ orders:get-overdue disponible');
  log('📊 orders:get-stats mandray options { startDate, endDate, search, statut, montantMin, montantMax, modePaiement }');
  log('⭐ orders:update-paiement raisina ny statut_paiement alefa avy amin\'ny UI');
  return true;
}

module.exports = { registerOrdersHandlers };