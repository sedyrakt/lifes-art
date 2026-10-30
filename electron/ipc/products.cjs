// ============================================================
// electron/ipc/products.cjs - RE-EXPORT PRINCIPAL
// ============================================================

const { registerProductsHandlers, emitProductsChanged } = require('./products/index.cjs');

module.exports = {
  registerProductsHandlers,
  emitProductsChanged,
};