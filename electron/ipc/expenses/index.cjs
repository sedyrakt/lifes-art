// ============================================================
// electron/ipc/expenses/index.cjs - RE-EXPORT PRINCIPAL
// ============================================================

const { registerExpensesHandlers } = require('./handlers.cjs');

module.exports = {
  registerExpensesHandlers,
};