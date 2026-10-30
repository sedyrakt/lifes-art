'use strict';

const { registerAchatsHandlers } = require('./achats/handlers.cjs');

module.exports = {
  registerAchatsHandlers,
  register: registerAchatsHandlers,
  registerHandlers: registerAchatsHandlers
};

console.log('🛒 [achats.cjs] Module principal chargé');