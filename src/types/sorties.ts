// src/types/sorties.ts

export interface SortieStock {
  id: number;
  produit_id: number;
  produit_nom?: string;
  produit_code?: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
  reference: string;
  destination: string;
  observation: string;
  date_sortie: string;
  created_at: string;
}

export interface SortiesStats {
  totalSorties: number;
  totalQuantite: number;
  totalValeur: number;
  destinations: number;
}

export interface SortiesFilters {
  searchTerm: string;
  filterProduit: string;
  sortOption: string;
}