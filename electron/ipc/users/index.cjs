// ============================================================
// electron/ipc/users/index.cjs - RE-EXPORT PRINCIPAL
// ============================================================

const { registerUsersHandlers } = require('./handlers.cjs');

module.exports = {
  registerUsersHandlers,
};