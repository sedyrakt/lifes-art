// ============================================================
// electron/ipc/fournisseurs/queries.cjs — FINAL FIX v3
// ⭐ FIX: Manohana `sortBy`/`sortOrder` (avy amin'ny frontend)
//    SY `sort` object (compatibilité amin'ny code hafa)
// ⭐ FIX: Default sort = 'created_at DESC' → ny fournisseur vaovao no voalohany
// ⭐ FIX: Tie-breaker 'f.id DESC' raha mitovy ny created_at
// ⭐ MAX_LIMIT = 200000 (ho an'ny export)
// ============================================================

const MAX_LIMIT = 200000;
const DEFAULT_LIMIT = 8;

// ⭐ Sort par défaut: "Date (Récent)" (created_at DESC)
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_ORDER = 'DESC';

// ⭐ Sort fields autorisés
const ALLOWED_SORT_FIELDS = ['nom', 'contact', 'telephone', 'email', 'created_at'];

// ⭐ Map ny SORT_MAP keys avy amin'ny frontend → field/direction
const SORT_KEY_MAP = {
  'Nom (A-Z)':     { field: 'nom',        direction: 'ASC'  },
  'Nom (Z-A)':     { field: 'nom',        direction: 'DESC' },
  'Date (Récent)': { field: 'created_at', direction: 'DESC' },
  'Date (Ancien)': { field: 'created_at', direction: 'ASC'  },
};

function normalizePage(page) {
  const n = Number(page);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function normalizeLimit(limit, fallback = DEFAULT_LIMIT) {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, MAX_LIMIT);
}

// ⭐⭐⭐ FIX: Manohana `sortBy`/`sortOrder` SY `sort` object ⭐⭐⭐
function normalizeSort(input) {
  let field = DEFAULT_SORT_BY;
  let direction = DEFAULT_SORT_ORDER;

  if (!input) return { field, direction };

  // ⭐ Cas 1: String (ex: 'Nom (A-Z)') → alaina avy amin'ny SORT_KEY_MAP
  if (typeof input === 'string') {
    const mapped = SORT_KEY_MAP[input];
    if (mapped) return mapped;
    // Raha ny input dia field mivantana (ex: 'nom')
    if (ALLOWED_SORT_FIELDS.includes(input)) {
      return { field: input, direction: input === 'created_at' ? 'DESC' : 'ASC' };
    }
    return { field, direction };
  }

  // ⭐ Cas 2: Object { field, direction } na { sortBy, sortOrder }
  if (typeof input === 'object') {
    const rawField = input.field || input.sortBy;
    const rawDirection = input.direction || input.sortOrder;

    if (rawField && ALLOWED_SORT_FIELDS.includes(rawField)) {
      field = rawField;
    }

    if (rawDirection === 'DESC' || rawDirection === 'ASC') {
      direction = rawDirection;
    } else {
      direction = field === 'created_at' ? DEFAULT_SORT_ORDER : 'ASC';
    }
  }

  return { field, direction };
}

function buildFournisseursQuery(options = {}) {
  const { search, sort, sortBy, sortOrder, email, telephone, dateFrom, dateTo } = options;

  let query = `SELECT f.id, f.nom, f.contact, f.telephone, f.email, f.adresse, f.created_at, f.updated_at FROM fournisseurs f WHERE 1=1`;
  const params = [];

  if (search) {
    query += ' AND (f.nom LIKE ? OR f.contact LIKE ? OR f.email LIKE ? OR f.telephone LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s);
  }
  if (email) { query += ' AND f.email LIKE ?'; params.push(`%${email}%`); }
  if (telephone) { query += ' AND f.telephone LIKE ?'; params.push(`%${telephone}%`); }
  if (dateFrom) { query += ' AND f.created_at >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND f.created_at < date(?, "+1 day")'; params.push(dateTo); }

  // ⭐⭐⭐ FIX: Alaina daholo ny sort format posibla ⭐⭐⭐
  const sortInput = sort || { field: sortBy, direction: sortOrder };
  const { field: sortField, direction: sortDir } = normalizeSort(sortInput);

  const limit = normalizeLimit(options.limit, DEFAULT_LIMIT);
  const page = normalizePage(options.page);
  const offset = (page - 1) * limit;

  query += ` ORDER BY f.${sortField} ${sortDir}, f.id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return { query, params };
}

function buildFournisseursCountQuery(options = {}) {
  const { search, email, telephone, dateFrom, dateTo } = options;
  let query = 'SELECT COUNT(*) as total FROM fournisseurs f WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (f.nom LIKE ? OR f.contact LIKE ? OR f.email LIKE ? OR f.telephone LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s);
  }
  if (email) { query += ' AND f.email LIKE ?'; params.push(`%${email}%`); }
  if (telephone) { query += ' AND f.telephone LIKE ?'; params.push(`%${telephone}%`); }
  if (dateFrom) { query += ' AND f.created_at >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND f.created_at < date(?, "+1 day")'; params.push(dateTo); }

  return { query, params };
}

module.exports = {
  MAX_LIMIT,
  DEFAULT_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  buildFournisseursQuery,
  buildFournisseursCountQuery,
  normalizeSort,
  normalizeLimit,
  normalizePage,
};