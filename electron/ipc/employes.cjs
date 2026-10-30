// electron/ipc/employes.cjs
const { registerEmployesHandlers, emitEmployesChanged } = require('./employes/index.cjs');

module.exports = {
  registerEmployesHandlers,
  emitEmployesChanged,
};

console.log('👷 [employes.cjs] Module principal chargé (version modulaire)');