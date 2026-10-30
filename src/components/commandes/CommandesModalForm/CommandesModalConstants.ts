// src/components/commandes/CommandesModalForm/CommandesModalConstants.ts
// ⭐ VAOVAO: `type_produit` ao amin'ny `Produit` interface
// ⭐ VAOVAO: `Commande` interface ho an'ny edit mode

export const COLORS = {
  light: {
    card: '#FFFFFF', border: '#E2E8F0', headerBg: '#FFFFFF', inputBg: '#FFFFFF',
    softBg: '#F8FAFC', text: '#0F172A', muted: '#64748B', subMuted: '#94A3B8',
    primary: '#4F46E5', primaryHover: '#4338CA', primaryBg: 'rgba(79,70,229,0.08)',
    green: '#059669', red: '#DC2626', amber: '#D97706',
  },
  dark: {
    card: '#0F172A', border: 'rgba(255,255,255,0.12)', headerBg: '#0F172A', inputBg: '#0F172A',
    softBg: '#0F172A', text: '#F8FAFC', muted: '#94A3B8', subMuted: '#94A3B8',
    primary: '#4F46E5', primaryHover: '#4338CA', primaryBg: 'rgba(79,70,229,0.12)',
    green: '#34D399', red: '#F87171', amber: '#FBBF24',
  },
};

export interface Client { id: number; nom: string; email: string; telephone: string; adresse: string; }

export interface Produit {
  id: number;
  nom: string;
  code: string;
  prix_vente: number;
  quantite_stock: number;
  unite?: string;
  tva_rate?: number;
  type_produit?: string;
}

export interface SelectedProduct { id: number; quantite: number; tva_rate?: number; }

// ⭐ NOUVEAU: Commande ho an'ny edit mode
export interface Commande {
  id: number;
  client_id?: number | null;
  client_nom?: string;
  mode_paiement?: string;
  modalite_paiement?: string;
  frais_livraison?: number;
  montant_paye?: number;
  total_ttc?: number;
  statut_paiement?: string;
}

export const formatMoney = (value: number) => `${Number(value || 0).toLocaleString('fr-FR')} Ar`;

// ⭐ NOUVEAU: Parse ny modalite_paiement ("15 jours" → { value: 15, unit: 'jours' })
export function parseModalite(modalite?: string): { value: number; unit: string } {
  if (!modalite) return { value: 0, unit: 'jours' };
  const raw = String(modalite).trim().toLowerCase();
  if (!raw || raw === 'immediat' || raw === 'immédiat' || raw === 'immediate' || raw === 'now') {
    return { value: 0, unit: 'jours' };
  }
  const match = raw.match(/^(\d+)\s*(minutes?|min|heures?|hrs?|jours?|j|mois|annees?|ans)?$/);
  if (!match) return { value: 0, unit: 'jours' };
  const value = parseInt(match[1], 10) || 0;
  const unitRaw = match[2] || 'jours';
  let unit = 'jours';
  if (unitRaw.startsWith('min')) unit = 'minutes';
  else if (unitRaw.startsWith('h') || unitRaw === 'hrs') unit = 'heures';
  else if (unitRaw.startsWith('jour') || unitRaw === 'j') unit = 'jours';
  else if (unitRaw.startsWith('mois')) unit = 'mois';
  else if (unitRaw.startsWith('annee') || unitRaw.startsWith('ans')) unit = 'annees';
  return { value, unit };
}