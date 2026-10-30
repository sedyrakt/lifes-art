// src/types/clients.ts

export interface Client {
  id: number;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  pays: string;
  image: string;
  type: 'Particulier' | 'Entreprise';
  created_at: string;
  total_achats?: number;
  nombre_commandes?: number;
  date_derniere_commande?: string;
}

export interface ClientsStats {
  totalClients: number;
  particuliers: number;
  entreprises: number;
  tauxContact: number;
}