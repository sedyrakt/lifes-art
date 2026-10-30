// ============================================================
// electron/ipc/stock/index.cjs
// ⭐ POINT D'ENTRÉE STOCK
// ============================================================

'use strict';

const {
  registerStockHandlers,
} = require('./handlers.cjs');

const {
  prepareStatements,
} = require('./statements.cjs');

const {
  safeLimit,
  buildDateCondition,
  buildEntreesQuery,
  buildSortiesQuery,
  buildMouvementsQuery,
} = require('./queries.cjs');

const {
  validateQuantity,
  validateLimit,
  validatePage,
  validateId,
  normalizeSearch,
  normalizeSortOrder,
  normalizeDate,
} = require('./validation.cjs');

const {
  emitMouvementAdded,
} = require('./events.cjs');

// ============================================================
// LOGIC
// ============================================================

let updateProduitStatutStock = null;

try {
  const logic =
    require('./logic.cjs');

  updateProduitStatutStock =
    logic.updateProduitStatutStock;
} catch (_) {
  updateProduitStatutStock =
    undefined;
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  registerStockHandlers,

  prepareStatements,

  safeLimit,
  buildDateCondition,

  buildEntreesQuery,
  buildSortiesQuery,
  buildMouvementsQuery,

  validateQuantity,
  validateLimit,
  validatePage,
  validateId,
  normalizeSearch,
  normalizeSortOrder,
  normalizeDate,

  emitMouvementAdded,

  updateProduitStatutStock,
};

console.log(
  '📦 [stock/index.cjs] Module stock chargé'
);