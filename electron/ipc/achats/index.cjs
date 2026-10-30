// ============================================================
// electron/ipc/achats.cjs - MODULE ACHATS
// ============================================================
'use strict';

const { registerAchatsHandlers } = require('./achats/handlers.cjs');
const { validateAchat } = require('./achats/validation.cjs');

// ⭐ IMPORTANT: Ny module dia tsy maintsy export registerAchatsHandlers
module.exports = { 
  registerAchatsHandlers, 
  validateAchat 
};