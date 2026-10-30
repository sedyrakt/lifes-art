// ============================================================
// electron/ipc/fournisseurs/index.cjs - RE-EXPORT PRINCIPAL
// ============================================================

const { registerFournisseursHandlers } = require('./handlers.cjs');

module.exports = {
  registerFournisseursHandlers,
};