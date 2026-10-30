// ============================================================
// electron/ipc/expenses.cjs - ENTRY POINT (MODULARISÉ)
// ⭐ Re-export rehetra avy amin'ny dossier expenses/
// ============================================================

const { registerExpensesHandlers } = require('./expenses/index.cjs');

module.exports = {
  registerExpensesHandlers,
};

console.log('💸 [expenses.cjs] Module principal chargé (version modulaire)');