// electron/ipc/products/queries.cjs
// ⭐ ESORINA ny filtre `status`
// ⭐ VAOVAO: filtre `fournisseurId` sy `typeProduit`

'use strict';

const SORT_FIELDS = Object.freeze({
  id: { column: 'p.id', tie: 'p.id' },
  nom: { column: 'p.nom COLLATE NOCASE', tie: 'p.id' },
  prix_vente: { column: 'p.prix_vente', tie: 'p.id' },
  quantite_stock: { column: 'p.quantite_stock', tie: 'p.id' },
  created_at: { column: 'p.created_at', tie: 'p.id' },
  type_produit: { column: 'p.type_produit COLLATE NOCASE', tie: 'p.id' }
});

const DEFAULT_LIMIT = 8, MAX_LIMIT = 200000;
const VALID_TYPES = new Set(['fini', 'matiere_premiere', 'fourniture']);

function normalizeLimit(limit) {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
}

function normalizePage(page) {
  const n = Number.parseInt(page, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function normalizeSort(sortBy, sortOrder) {
  const field = SORT_FIELDS[sortBy] ? sortBy : 'id';
  const direction = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { field, direction, ...SORT_FIELDS[field] };
}

function addFilters(query, params, options) {
  // ⭐ ESORINA `status` — tsy misy archive/actif/inactif intsony
  const { search, categorieId, fournisseurId, typeProduit, prixMin, prixMax, dateFrom, dateTo } = options;

  if (search && search.trim() !== '') {
    query += ` AND (p.nom LIKE ? OR p.code LIKE ?)`;
    const s = `%${search.trim()}%`;
    params.push(s, s);
  }

  if (categorieId !== undefined && categorieId !== null && categorieId !== '') {
    query += ` AND p.categorie_id = ?`;
    params.push(Number.parseInt(categorieId, 10));
  }

  if (fournisseurId !== undefined && fournisseurId !== null && fournisseurId !== '') {
    query += ` AND p.fournisseur_id = ?`;
    params.push(Number.parseInt(fournisseurId, 10));
  }

  // ⭐ VAOVAO: Filtre type_produit
  if (typeProduit !== undefined && typeProduit !== null && typeProduit !== '') {
    const t = String(typeProduit).trim().toLowerCase();
    if (VALID_TYPES.has(t)) {
      query += ` AND p.type_produit = ?`;
      params.push(t);
    }
  }

  if (prixMin !== undefined && prixMin !== null && prixMin !== '') {
    query += ` AND p.prix_vente >= ?`;
    params.push(Number(prixMin));
  }

  if (prixMax !== undefined && prixMax !== null && prixMax !== '') {
    query += ` AND p.prix_vente <= ?`;
    params.push(Number(prixMax));
  }

  if (dateFrom) {
    query += ` AND p.created_at >= ?`;
    params.push(dateFrom);
  }

  if (dateTo) {
    query += ` AND p.created_at <= ?`;
    params.push(dateTo);
  }

  return query;
}

function buildProductsQuery(options = {}) {
  const page = normalizePage(options.page);
  const limit = normalizeLimit(options.limit);
  const offset = (page - 1) * limit;
  const sort = normalizeSort(options.sortBy, options.sortOrder);

  let query = `
    SELECT p.id, p.code, p.nom, p.description, p.categorie_id, p.fournisseur_id,
      p.prix_achat, p.prix_vente, p.quantite_stock, p.quantite_minimale, p.unite, p.tva_rate,
      p.type_produit, p.statut_stock, p.created_at, p.updated_at,
      c.nom AS categorie_nom, f.nom AS fournisseur_nom,
      (SELECT COUNT(DISTINCT dc.commande_id) FROM details_commandes dc WHERE dc.produit_id = p.id) AS nb_commandes
    FROM produits p
    LEFT JOIN categories c ON c.id = p.categorie_id
    LEFT JOIN fournisseurs f ON f.id = p.fournisseur_id
    WHERE 1 = 1`;

  const params = [];
  query = addFilters(query, params, options);
  query += ` ORDER BY ${sort.column} ${sort.direction}, p.id ${sort.direction} LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return { query, params, limit, offset, page, sort };
}

function buildProductsCountQuery(options = {}) {
  let query = `SELECT COUNT(*) AS total FROM produits p
    LEFT JOIN categories c ON c.id = p.categorie_id
    LEFT JOIN fournisseurs f ON f.id = p.fournisseur_id
    WHERE 1 = 1`;
  const params = [];
  query = addFilters(query, params, options);
  return { query, params };
}

module.exports = {
  buildProductsQuery,
  buildProductsCountQuery,
  normalizeLimit,
  normalizeSort
};