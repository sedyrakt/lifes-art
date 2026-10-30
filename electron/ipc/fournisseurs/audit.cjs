// ============================================================
// electron/ipc/fournisseurs/audit.cjs - AUDIT LOG (10/10)
// ============================================================

const { getDb } = require('../../database/connection.cjs');
const { log, error } = require('../../database/utils.cjs');

function logAudit(action, fournisseurId, fournisseurName, userId, details = '') {
  try {
    const db = getDb();
    if (!db) return;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity, entity_id, entity_name, user_id, details, created_at)
      VALUES (?, 'fournisseur', ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(action, fournisseurId, fournisseurName, userId, details);
    log(`📝 Audit: ${action} - ${fournisseurName} (${fournisseurId})`);
  } catch (err) {
    error('⚠️ Erreur audit log:', err.message);
  }
}

module.exports = { logAudit };