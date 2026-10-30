// src/types/mouvements.ts

export interface Mouvement {
  id: number;
  produit_id: number;
  produit_nom: string;
  produit_code: string;
  type_mouvement: string;
  quantite: number;
  ancien_stock: number;
  nouveau_stock: number;
  date_mouvement: string;
  reference: string;
  user_id: number;
  observation: string;
  created_at: string;
  prix_achat?: number;
}

export interface MouvementsStats {
  total: number;
  entrees: number;
  sorties: number;
  ajustements: number;
  quantiteEntree: number;
  quantiteSortie: number;
}

export const TYPE_MOUVEMENTS = {
  ENTREE: 'ENTREE',
  SORTIE: 'SORTIE',
  AJUSTEMENT: 'AJUSTEMENT'
} as const;

export type TypeMouvement = typeof TYPE_MOUVEMENTS[keyof typeof TYPE_MOUVEMENTS];

export const TYPE_LABELS: Record<TypeMouvement, string> = {
  [TYPE_MOUVEMENTS.ENTREE]: 'Entrée',
  [TYPE_MOUVEMENTS.SORTIE]: 'Sortie',
  [TYPE_MOUVEMENTS.AJUSTEMENT]: 'Ajustement'
};

export const TYPE_COLORS: Record<TypeMouvement, string> = {
  [TYPE_MOUVEMENTS.ENTREE]: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  [TYPE_MOUVEMENTS.SORTIE]: 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  [TYPE_MOUVEMENTS.AJUSTEMENT]: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
};