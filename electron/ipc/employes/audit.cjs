const { getDb } = require('../../database/connection.cjs');
const { log, error } = require('./logger.cjs');

const logAudit = (action, employeId, employeName, userId, details = '') => {
  try {
    const db = getDb();
    if (!db) return;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at)
      VALUES (?, 'employe', ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(action, employeId, employeName, userId, details);
    log(`📝 Audit: ${action} - ${employeName} (${employeId})`);
  } catch (err) {
    error('⚠️ Erreur audit log:', err.message);
  }
};

module.exports = { logAudit };