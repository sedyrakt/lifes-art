'use strict';

const { registerAuthHandlers } = require('./auth/handlers.cjs');

module.exports = {
  registerAuthHandlers
};

console.log('🔐 [auth.cjs] Module auth chargé avec succès');