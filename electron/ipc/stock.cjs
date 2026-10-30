const { registerStockHandlers } = require('./stock/handlers.cjs');
module.exports = {
  registerStockHandlers,
  register: registerStockHandlers,  // ⭐ Alias
  registerHandlers: registerStockHandlers  // ⭐ Alias
};