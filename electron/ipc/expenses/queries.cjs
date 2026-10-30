// ============================================================
// electron/ipc/expenses/queries.cjs - PAGE-BASED 8 PER PAGE
// ⭐ FIX: DEFAULT_LIMIT = 8
// ============================================================

const DEFAULT_LIMIT = 8; // ⭐ FIX: Natao ho 8
const MAX_LIMIT = 100;
const ALLOWED_SORTS = { date_depense: { field: 'd.date_depense' }, montant: { field: 'd.montant' }, description: { field: 'd.description' }, id: { field: 'd.id' } };

function normalizePage(page) { const n = Number(page); return Number.isFinite(n) && n > 0 ? n : 1; }
function normalizeLimit(limit) { const n = Number.parseInt(limit, 10); if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT; return Math.min(n, MAX_LIMIT); }
function normalizeSort(sort = {}) { const field = ALLOWED_SORTS[sort.field] ? sort.field : 'id'; const direction = sort.direction === 'ASC' ? 'ASC' : 'DESC'; return { field, direction, ...ALLOWED_SORTS[field] }; }

function buildExpensesQuery(options = {}) {
  const { search, categorie, mode, startDate, endDate, sort } = options;
  const limit = normalizeLimit(options.limit);
  const page = normalizePage(options.page);
  const offset = (page - 1) * limit;
  const sortConfig = normalizeSort(sort);
  let query = `SELECT d.*, f.nom AS fournisseur_nom FROM depenses d LEFT JOIN fournisseurs f ON d.fournisseur_id = f.id WHERE 1=1`;
  const params = [];
  if (categorie) { query += ' AND d.categorie = ?'; params.push(categorie); }
  if (mode) { query += ' AND d.mode_paiement = ?'; params.push(mode); }
  if (startDate) { query += ' AND d.date_depense >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND d.date_depense <= ?'; params.push(endDate); }
  if (search) { query += ' AND (d.description LIKE ? OR d.reference LIKE ? OR f.nom LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
  query += ` ORDER BY ${sortConfig.field} ${sortConfig.direction}, d.id ${sortConfig.direction} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return { query, params, limit, page, offset, sort: sortConfig };
}

function buildExpensesCountQuery(options = {}) {
  const { search, categorie, mode, startDate, endDate } = options;
  let query = `SELECT COUNT(*) AS total FROM depenses d LEFT JOIN fournisseurs f ON d.fournisseur_id = f.id WHERE 1=1`;
  const params = [];
  if (categorie) { query += ' AND d.categorie = ?'; params.push(categorie); }
  if (mode) { query += ' AND d.mode_paiement = ?'; params.push(mode); }
  if (startDate) { query += ' AND d.date_depense >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND d.date_depense <= ?'; params.push(endDate); }
  if (search) { query += ' AND (d.description LIKE ? OR d.reference LIKE ? OR f.nom LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
  return { query, params };
}

module.exports = { buildExpensesQuery, buildExpensesCountQuery };