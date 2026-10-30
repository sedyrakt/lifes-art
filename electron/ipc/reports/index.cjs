// ============================================================
// electron/ipc/reports/index.cjs - RE-EXPORT PRINCIPAL (10/10)
// ============================================================

const { registerReportsHandlers } = require('./handlers.cjs');
const { emitReportsChanged } = require('./utils.cjs');

module.exports = {
  registerReportsHandlers,
  emitReportsChanged,
};