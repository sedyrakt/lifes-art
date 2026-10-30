// ============================================================
// electron/ipc/clients/audit.cjs - AUDIT LOG (10/10)
// ⭐ FANITSARA: Nohamarinina ny DB connection path sy userId
// ============================================================

const { getDb } = require('../../database/connection.cjs');
const { error } = require('./utils.cjs');

const logAudit = (action, clientId, clientName, userId, details = '') => {
  try {
    const db = getDb();
    if (!db) return;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at)
      VALUES (?, 'client', ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(action, clientId, clientName, userId || null, details);
    
    const { log } = require('./utils.cjs');
    log(`📝 Audit: ${action} - ${clientName} (${clientId})`);
  } catch (err) {
    error('⚠️ Erreur audit log:', err.message);
  }
};

module.exports = { logAudit };