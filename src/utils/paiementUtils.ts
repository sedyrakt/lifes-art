// src/utils/paiementUtils.ts
// ⭐ Utilitaires paiements — Madagascar
// ⭐ NOUVEAU: normalizePaymentStatus (Brouillon / Payé / Non payé — tsy misy Partiel)
// ⭐ FIX: 'Partiel' (legacy) → avadika ho 'Non payé'

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ⭐ Statut tokony ho (tsy misy 'Partiel')
export type PaiementStatut = 'Brouillon' | 'Payé' | 'Non payé';

// ⭐ Fanamarihana: 'Partiel' dia legacy ihany (avy amin'ny version taloha)

// ============================================================
// HELPERS NUMÉRIQUES
// ============================================================

export function toNumber(v: unknown, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

// ============================================================
// HELPERS DATE
// ============================================================

export function normalizeDateISO(v?: string | null): string {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function formatDate(v?: string | null): string {
  const n = normalizeDateISO(v);
  if (!n) return '—';
  const [y, m, d] = n.split('-');
  return `${d}/${m}/${y}`;
}

// ============================================================
// HELPERS FORMAT
// ============================================================

export function formatAriary(v: unknown): string {
  return `${Math.round(toNumber(v)).toLocaleString('fr-FR')} Ar`;
}

export function getMonthName(m: number): string {
  return MONTHS[m - 1] || '—';
}

// ============================================================
// HELPERS API
// ============================================================

export function extractData<T>(r: any, fb: T): T {
  if (r && typeof r === 'object' && 'data' in r) return r.data ?? fb;
  return r ?? fb;
}

export function isApiFailure(r: any): boolean {
  return r?.success === false;
}

// ============================================================
// HELPERS EMPLOYÉ
// ============================================================

export function getEmployeeName(e: { prenom?: string; nom?: string }): string {
  return `${e.prenom ?? ''} ${e.nom ?? ''}`.trim() || 'Employé';
}

// ============================================================
// ⭐ NORMALIZE PAYMENT STATUS (Brouillon / Payé / Non payé)
// ============================================================
/**
 * Manara-penitra ny statut avy amin'ny backend (na ancien data).
 *
 * Statut telo ihany:
 *   - 'Brouillon' : mbola tsy voamarina
 *   - 'Payé'      : feno ny paiement
 *   - 'Non payé'  : mbola tsy feno (na avance ihany)
 *
 * Ny 'Partiel' (legacy) dia avadika ho 'Non payé'.
 * Ny 'Partiel' + montant > 0 dia avadika ho 'Payé' (raha efa nisy paiement).
 *
 * @param statut   Sanda avy amin'ny DB / API
 * @param montant  Montant effectivement payé (optionnel — hamantarana fallback)
 * @param avance   Avance (optionnel — totalin'ny vola naloa)
 * @param netAPayer Net à payer (optionnel — hamantarana raha feno)
 */
export function normalizePaymentStatus(
  statut: unknown,
  montant: unknown = 0,
  avance: unknown = 0,
  netAPayer: unknown = 0,
): PaiementStatut {
  const value = String(statut ?? '').trim().toLowerCase();
  const amount = toNumber(montant);
  const advance = toNumber(avance);
  const net = toNumber(netAPayer);
  const totalVerse = amount + advance;

  // 1. Brouillon
  if (value === 'brouillon' || value === 'draft') return 'Brouillon';

  // 2. Payé
  if (value === 'payé' || value === 'paye' || value === 'paid') return 'Payé';

  // 3. Non payé
  if (
    value === 'non payé' ||
    value === 'non paye' ||
    value === 'impayé' ||
    value === 'impaye' ||
    value === 'unpaid'
  ) {
    return 'Non payé';
  }

  // 4. ⭐ Legacy: 'Partiel' → 'Non payé' (na 'Payé' raha feno)
  if (value === 'partiel' || value === 'partial') {
    // Raha omena ny net, dia jereo raha feno
    if (net > 0) {
      if (totalVerse <= 0) return 'Non payé';
      if (totalVerse >= net) return 'Payé';
      return 'Non payé';
    }
    // Legacy: fallback amin'ny montant
    return amount > 0 ? 'Payé' : 'Non payé';
  }

  // 5. Fallback (na inona na inona)
  if (net > 0) {
    if (totalVerse <= 0) return 'Non payé';
    if (totalVerse >= net) return 'Payé';
    return 'Non payé';
  }
  return amount > 0 ? 'Payé' : 'Non payé';
}

// ============================================================
// ⭐ COMPUTE PAYMENT STATUS (avy amin'ny workflow)
// ============================================================
/**
 * Mamantatra ny statut automatique avy amin'ny état du document.
 *
 * @param workflow 'Brouillon' | 'Validé'
 * @param montant  Montant effectivement payé
 * @param avance   Vola naloa mialoha
 * @param netAPayer Total tokony aloa (net)
 */
export function computePaymentStatus(
  workflow: 'Brouillon' | 'Validé',
  montant: number,
  avance: number = 0,
  netAPayer: number = 0,
): PaiementStatut {
  // 1. Raha mbola Brouillon → Brouillon foana
  if (workflow === 'Brouillon') return 'Brouillon';

  const montantNum = Math.max(0, toNumber(montant));
  const avanceNum = Math.max(0, toNumber(avance));
  const netNum = Math.max(0, toNumber(netAPayer));
  const totalVerse = montantNum + avanceNum;

  // 2. Tsy nisy vola naloa mihitsy → Non payé
  if (totalVerse <= 0) return 'Non payé';

  // 3. Legacy: net tsy omena → Payé raha misy vola
  if (netNum <= 0) return 'Payé';

  // 4. Feno na mihoatra ny net → Payé
  if (totalVerse >= netNum) return 'Payé';

  // 5. Mbola tsy feno → Non payé (fa tsy 'Partiel')
  return 'Non payé';
}

// ============================================================
// ⭐ STATUS STYLES (Brouillon / Payé / Non payé)
// ============================================================

export interface StatusStyle {
  light: { bg: string; text: string; border: string };
  dark: { bg: string; text: string; border: string };
}

export const STATUS_STYLES: Record<PaiementStatut, StatusStyle> = {
  Brouillon: {
    light: { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
    dark: { bg: 'rgba(148,163,184,.15)', text: '#94A3B8', border: 'rgba(148,163,184,.3)' },
  },
  Payé: {
    light: { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
    dark: { bg: 'rgba(34,197,94,.15)', text: '#4ADE80', border: 'rgba(34,197,94,.3)' },
  },
  'Non payé': {
    light: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
    dark: { bg: 'rgba(239,68,68,.15)', text: '#F87171', border: 'rgba(239,68,68,.3)' },
  },
};

// ============================================================
// ⭐ STATUT FILTER TYPE
// ============================================================

export type StatutFilter = 'Tous' | PaiementStatut;