// src/types/rapports.ts

export interface RapportsStats {
  totalProduits: number;
  totalVentes: number;
  totalEntrees: number;
  totalSorties: number;
  chiffreAffaires: number;
  benefice: number;
  nbCommandes: number;
  nbClients: number;
  tauxBenefice: number;
}

export interface TopProduit {
  id: number;
  nom: string;
  code: string;
  total_vendu?: number;
  total_ventes?: number;
  total?: number;
}

export interface VenteParMois {
  mois: string;
  total_ventes: number;
}

export interface CategorieRepartition {
  categorie: string;
  total: number;
}

export interface CommandeRecente {
  id: number;
  client_nom: string;
  date_commande: string;
  total_ttc: number;
  statut: string;
  nb_produits?: number;
  numero?: string;
}

export type Periode = 'mois' | 'trimestre' | 'annee';