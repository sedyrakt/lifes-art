// src/utils/produitHelpers.ts

export const getStatusColor = (status: string) => {
  return status === 'actif' 
    ? `bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800`
    : `bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:rose-300 border border-rose-200 dark:border-rose-800`;
};

export const getStockLevel = (stock: number, min: number) => {
  const ratio = min > 0 ? stock / min : 999;
  if (ratio <= 1) return { level: 'critique', color: 'text-rose-500', bg: 'bg-rose-500' };
  if (ratio <= 2) return { level: 'faible', color: 'text-amber-500', bg: 'bg-amber-500' };
  if (ratio <= 5) return { level: 'moyen', color: 'text-indigo-500', bg: 'bg-indigo-500' };
  return { level: 'élevé', color: 'text-emerald-500', bg: 'bg-emerald-500' };
};

export const generateProductCode = (totalItems: number) => {
  const prefix = 'PRD';
  const num = String(totalItems + 1).padStart(4, '0');
  return `${prefix}-${num}`;
};