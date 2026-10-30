// ============================================================
// electron/ipc/users.cjs - ENTRY POINT (MODULARISÉ)
// ⭐ Re-export rehetra avy amin'ny dossier users/
// ============================================================

const { registerUsersHandlers } = require('./users/index.cjs');

module.exports = {
  registerUsersHandlers,
};

console.log('👥 [users.cjs] Module principal chargé (version modulaire)');