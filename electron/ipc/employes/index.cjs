// electron/ipc/employes/index.cjs
const { registerEmployesHandlers, emitEmployesChanged } = require('./handlers.cjs');

module.exports = {
  registerEmployesHandlers,
  emitEmployesChanged,
};