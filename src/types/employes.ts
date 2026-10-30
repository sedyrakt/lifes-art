// src/types/employes.ts

export interface Employe {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste: string;
  departement: string;
  date_embauche: string;
  salaire: number;
  image: string;
  status: string;      // 'actif', 'inactif', 'en_conge'
  created_at: string;
  updated_at?: string;
}

export interface Paiement {
  id: number;
  employe_id: number;
  mois: number;
  annee: number;
  montant: number;
  mode_paiement: string;
  reference: string;
  observation: string;
  date_paiement: string;
  created_at: string;
}

export interface EmployesStats {
  totalEmployes: number;
  actifs: number;
  enConge: number;
  inactifs: number;
  totalSalaire: number;
  moyenne: number;
  postes: string[];
  statsParPoste: { poste: string; nb: number; total: number; moyenne: number }[];
  tauxActif: number;
}

// ⭐ Status mapping (pour l'affichage)
export const STATUS_MAP: Record<string, string> = {
  'actif': 'Actif',
  'inactif': 'Inactif',
  'en_conge': 'En congé',
  'En congé': 'En congé',
  'Inactif': 'Inactif',
  'Actif': 'Actif',
};

export const STATUS_REVERSE_MAP: Record<string, string> = {
  'Actif': 'actif',
  'Inactif': 'inactif',
  'En congé': 'en_conge',
};

export const STATUS_OPTIONS = ['Tous', 'Actif', 'Inactif', 'En congé'];