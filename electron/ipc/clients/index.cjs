// ============================================================
// electron/ipc/clients/index.cjs - ENTRY POINT (10/10)
// ⭐ FANITSARA: Export ny emitClientsChanged
// ============================================================

const { registerClientsHandlers, emitClientsChanged } = require('./handlers.cjs');

module.exports = {
  registerClientsHandlers,
  emitClientsChanged,
};