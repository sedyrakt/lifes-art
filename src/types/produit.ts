// src/types/produits.ts
// ⭐ ESORINA `filterStatus` sy `status`
// ⭐ VAOVAO: `type_produit` sy `filterType`

export type TypeProduit = 'fini' | 'matiere_premiere' | 'fourniture';

export interface Produit {
  id: number;
  code: string;
  nom: string;
  description: string;
  categorie_id: number;
  categorie_nom?: string;
  fournisseur_id: number | null;
  fournisseur_nom?: string;
  prix_achat: number;
  prix_vente: number;
  quantite_stock: number;
  quantite_minimale: number;
  unite: string;
  image: string;
  type_produit?: TypeProduit;   // ⭐ VAOVAO
  created_at: string;
  updated_at?: string;
  nb_commandes?: number;
}

export interface ProduitsStats {
  totalValeur: number;
  totalStock: number;
  alertes: number;
}

export interface ProduitsFilters {
  searchTerm: string;
  filterCategorie: string;
  filterFournisseur: string;
  filterType: string;           // ⭐ VAOVAO
  sortOption: string;
}