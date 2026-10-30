// electron/database/tables/migrations/index.cjs
'use strict';

const { migrateClients } = require('./clients.cjs');
const { migrateEmployees } = require('./employees.cjs');
const { migrateOrders } = require('./orders.cjs');
const { migratePayments } = require('./payments.cjs');
const { migratePaymentsUnique } = require('./payments_unique.cjs');
const { migratePayroll } = require('./payroll.cjs');
const { migratePresences } = require('./presences.cjs');
const { migrateProducts } = require('./products.cjs');
const { migratePurchases } = require('./purchases.cjs');
const { migrateStock } = require('./stock.cjs');
const { migrateUsers } = require('./users.cjs');

function runAllMigrations(db) {
  // ─── Tables de base ───
  migrateUsers(db);
  migrateClients(db);
  migrateProducts(db);
  migrateOrders(db);
  migratePurchases(db);
  migrateStock(db);

  // ─── RH ───
  migrateEmployees(db);
  migratePayments(db);
  migratePaymentsUnique(db);
  migratePayroll(db);
  migratePresences(db);
}

module.exports = { runAllMigrations };