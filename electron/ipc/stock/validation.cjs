// ============================================================
// electron/ipc/stock/validation.cjs
// ⭐ 20M READY
// ⭐ Validation centralisée
// ============================================================

function validateQuantity(value) {
  const qty = Number(value);

  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      valid: false,
      error: 'La quantité doit être un nombre positif',
    };
  }

  return {
    valid: true,
    value: Math.floor(qty),
  };
}

function validateLimit(value, defaultLimit = 50, maxLimit = 500) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return Math.min(defaultLimit, maxLimit);
  }

  return Math.min(
    Math.max(Math.floor(parsed), 1),
    maxLimit
  );
}

function validatePage(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function validateId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function normalizeSearch(value, maxLength = 100) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, maxLength);
}

function normalizeSortOrder(value) {
  return String(value || '').toUpperCase() === 'ASC'
    ? 'ASC'
    : 'DESC';
}

function normalizeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return String(value);
}

module.exports = {
  validateQuantity,
  validateLimit,
  validatePage,
  validateId,
  normalizeSearch,
  normalizeSortOrder,
  normalizeDate,
};