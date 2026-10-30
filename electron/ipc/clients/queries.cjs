// ============================================================
// electron/ipc/clients/queries.cjs — FINAL FIX v6
// ⭐ FIX v6: buildClientsStatsQuery + buildClientsTotalAchatsQuery
//          mandray filters (options) mba hifanaraka amin'ny recherche
// ============================================================

const MAX_LIMIT = 200000;
const DEFAULT_LIMIT = 8;

const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_ORDER = 'DESC';

const ALLOWED_SORTS = {
  nom:              { field: 'nom',              expression: "COALESCE(c.nom, '')" },
  email:            { field: 'email',            expression: "COALESCE(c.email, '')" },
  ville:            { field: 'ville',            expression: "COALESCE(c.ville, '')" },
  type:             { field: 'type',             expression: "COALESCE(c.type, '')" },
  created_at:       { field: 'created_at',       expression: "COALESCE(c.created_at, '')" },
  id:               { field: 'id',               expression: 'c.id' },
  total_achats:     { field: 'total_achats',     expression: "COALESCE(SUM(co.total_ttc), 0)" },
  nombre_commandes: { field: 'nombre_commandes', expression: "COUNT(DISTINCT co.id)" },
};

function normalizeLimit(limit) {
  const value = Number.parseInt(limit, 10);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
  return Math.min(value, MAX_LIMIT);
}

function normalizePage(page) {
  const n = Number.parseInt(page, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function normalizeSort(options = {}) {
  let sortBy = options.sortBy;
  if (options.sort?.field) sortBy = options.sort.field;
  if (!ALLOWED_SORTS[sortBy]) sortBy = DEFAULT_SORT_BY;

  let sortOrder = options.sortOrder;
  if (options.sort?.direction) sortOrder = options.sort.direction;
  const fallbackOrder = sortBy === DEFAULT_SORT_BY ? DEFAULT_SORT_ORDER : 'ASC';
  sortOrder = String(sortOrder || fallbackOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return {
    sortBy,
    sortOrder,
    field: ALLOWED_SORTS[sortBy].field,
    expression: ALLOWED_SORTS[sortBy].expression,
  };
}

function buildWhere(options = {}, alias = 'c') {
  const { search, type, ville, pays, dateFrom, dateTo } = options;
  const prefix = alias ? `${alias}.` : '';
  const where = [];
  const params = [];

  if (typeof search === 'string' && search.trim()) {
    const value = search.trim();
    const pattern = `%${value}%`;
    where.push(`(${prefix}nom LIKE ? OR ${prefix}email LIKE ? OR ${prefix}telephone LIKE ? OR ${prefix}ville LIKE ?)`);
    params.push(pattern, pattern, pattern, pattern);
  }
  if (type && type !== 'Tous' && ['Particulier', 'Entreprise'].includes(type)) {
    where.push(`${prefix}type = ?`);
    params.push(type);
  }
  if (typeof ville === 'string' && ville.trim()) {
    where.push(`${prefix}ville = ?`);
    params.push(ville.trim());
  }
  if (typeof pays === 'string' && pays.trim()) {
    where.push(`${prefix}pays = ?`);
    params.push(pays.trim());
  }
  if (dateFrom) {
    where.push(`${prefix}created_at >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push(`${prefix}created_at <= ?`);
    params.push(dateTo);
  }

  return { where, params };
}

// ⭐⭐⭐ GET ALL — mampiasa COUNT(DISTINCT co.id) ho an'ny nombre_commandes ⭐⭐⭐
function buildClientsQuery(options = {}) {
  const { where, params } = buildWhere(options, 'c');
  const { sortOrder, expression } = normalizeSort(options);
  const safeLimit = normalizeLimit(options.limit);
  const safePage = normalizePage(options.page);
  const offset = (safePage - 1) * safeLimit;
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const query = `
    SELECT
      c.id,
      c.nom,
      c.email,
      c.telephone,
      c.adresse,
      c.ville,
      c.code_postal,
      c.pays,
      c.type,
      c.created_at,
      c.updated_at,
      COALESCE(SUM(co.total_ttc), 0) AS total_achats,
      COUNT(DISTINCT co.id) AS nombre_commandes
    FROM clients c
    LEFT JOIN commandes co ON co.client_id = c.id
    ${whereClause}
    GROUP BY c.id
    ORDER BY ${expression} ${sortOrder}, c.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(safeLimit, offset);
  return { query, params, limit: safeLimit, page: safePage, offset };
}

// ⭐ COUNT(DISTINCT c.id) mba tsy hisy duplicates
function buildClientsCountQuery(options = {}) {
  const { where, params } = buildWhere(options, 'c');
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return {
    query: `SELECT COUNT(DISTINCT c.id) AS total FROM clients c ${whereClause}`,
    params,
  };
}

// ⭐ Stats query — MANDRAY FILTERS
function buildClientsStatsQuery(options = {}) {
  const { where, params } = buildWhere(options, 'c');
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return {
    query: `
      SELECT 
        COUNT(DISTINCT c.id) AS total,
        COUNT(DISTINCT CASE WHEN c.type = 'Particulier' THEN c.id END) AS particuliers,
        COUNT(DISTINCT CASE WHEN c.type = 'Entreprise' THEN c.id END) AS entreprises,
        COUNT(DISTINCT c.ville) AS villes,
        COUNT(DISTINCT CASE WHEN c.telephone IS NOT NULL AND TRIM(c.telephone) != '' THEN c.id END) AS avec_telephone
      FROM clients c
      ${whereClause}
    `,
    params,
  };
}

// ⭐ Total achats MANDRAY FILTERS
function buildClientsTotalAchatsQuery(options = {}) {
  const { where, params } = buildWhere(options, 'c');
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return {
    query: `
      SELECT COALESCE(SUM(co.total_ttc), 0) AS total_achats 
      FROM clients c 
      LEFT JOIN commandes co ON co.client_id = c.id 
      ${whereClause}
    `,
    params,
  };
}

// ⭐ Total commandes (avy amin'ny table commandes)
function buildClientsTotalCommandesQuery() {
  return {
    query: `SELECT COUNT(*) AS total_commandes FROM commandes`,
    params: [],
  };
}

module.exports = {
  MAX_LIMIT,
  DEFAULT_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  buildClientsQuery,
  buildClientsCountQuery,
  buildClientsStatsQuery,
  buildClientsTotalAchatsQuery,
  buildClientsTotalCommandesQuery,
  normalizeLimit,
  normalizeSort,
  normalizePage,
};