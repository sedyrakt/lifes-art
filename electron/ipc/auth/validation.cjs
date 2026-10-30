// ============================================================
// electron/ipc/auth/validation.cjs
// ============================================================
'use strict';

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function normalizeRow(row) {
  if (!row) return null;
  
  const normalized = { ...row };
  
  // Convertir les champs snake_case en camelCase
  if (normalized.created_at) {
    normalized.createdAt = normalized.created_at;
  }
  if (normalized.updated_at) {
    normalized.updatedAt = normalized.updated_at;
  }
  if (normalized.firstName === undefined && normalized.first_name) {
    normalized.firstName = normalized.first_name;
  }
  if (normalized.lastName === undefined && normalized.last_name) {
    normalized.lastName = normalized.last_name;
  }
  if (normalized.companyName === undefined && normalized.company_name) {
    normalized.companyName = normalized.company_name;
  }
  
  return normalized;
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeRow);
}

module.exports = {
  normalizeEmail,
  normalizeRow,
  normalizeRows
};