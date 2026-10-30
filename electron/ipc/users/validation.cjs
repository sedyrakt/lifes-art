// ============================================================
// electron/ipc/users/validation.cjs - VALIDATION HELPERS
// ============================================================

function normalizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

function validateNotEmpty(value) {
  return value && typeof value === 'string' && value.trim().length > 0;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Mot de passe requis' };
  }
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  return { valid: true, trimmed };
}

const VALID_ROLES = ['admin', 'user', 'manager', 'viewer'];
const VALID_STATUSES = ['actif', 'inactif', 'suspendu'];

module.exports = {
  normalizeEmail,
  validateEmail,
  validateNotEmpty,
  validatePassword,
  VALID_ROLES,
  VALID_STATUSES,
};