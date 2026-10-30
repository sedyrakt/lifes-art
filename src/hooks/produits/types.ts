// src/hooks/produits/types.ts
// ⭐ ESORINA `filterStatus`
// ⭐ VAOVAO: `filterFournisseur` sy `filterType`

export type SortOption =
  | 'Nom (A-Z)'
  | 'Nom (Z-A)'
  | 'Prix (Croissant)'
  | 'Prix (Décroissant)'
  | 'Stock (Croissant)'
  | 'Stock (Décroissant)'
  | 'Nouveaux d\'abord';

export type TypeProduit = 'fini' | 'matiere_premiere' | 'fourniture';

export interface ProduitFilters {
  searchTerm: string;
  filterCategorie: string;
  filterFournisseur: string;
  filterType: string;           // ⭐ VAOVAO
  prixMin: string;
  prixMax: string;
  dateFrom: string;
  dateTo: string;
}

export type ExportPeriod = 'aujourdhui' | 'hier' | 'semaine' | 'mois' | 'annee' | 'custom';