// ============================================================
// electron/ipc/reports.cjs - ENTRY POINT (MODULARISÉ)
// ⭐ Re-export rehetra avy amin'ny dossier reports/
// ============================================================

const {
  registerReportsHandlers,
  emitReportsChanged,
} = require('./reports/index.cjs');

module.exports = {
  registerReportsHandlers,
  emitReportsChanged,
};

console.log('📊 [reports.cjs] Module principal chargé (version modulaire)');