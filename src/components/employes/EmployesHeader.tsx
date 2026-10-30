// EmployesHeader.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur DashboardHeader, ProduitsHeader, CategoriesHeader, etc.
// ⭐ FONT SIZE: h1 20px, subtitle 13px, buttons 14px
// ⭐ FIX: ESORINA ny bouton "Exporter" sy ny menu export rehetra
// ⭐ NOUVEAU: Bouton "Historique" (nafindra avy amin'ny EmployesCalendrier)

import React from 'react';
import { Plus, RefreshCw, History } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface EmployesHeaderProps {
  onAddEmploye: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  totalItems?: number;
  /** ⭐ NOUVEAU: Callback rehefa tsindriana ny bouton "Historique" */
  onOpenHistorique?: () => void;
}

const EmployesHeader: React.FC<EmployesHeaderProps> = ({
  onAddEmploye,
  refreshing = false,
  onRefresh,
  totalItems,
  onOpenHistorique,
}) => {
  const { isDark } = useTheme();
  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-200';

  return (
    <header className="mb-4 w-full relative z-[100]">
      <div className={`group relative flex flex-col gap-3 rounded-xl border-[0.5px] shadow-sm transition-colors duration-200 md:flex-row md:items-center md:justify-between px-3 py-2.5 ${isDark ? 'bg-[#0F172A]' : 'bg-white'} ${borderColor}`}>
        <div className="absolute left-0 top-0 h-full w-[2px] bg-brand-500" />

        <div className="relative z-10 flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-slate-100">Employés</h1>
            {totalItems !== undefined && (
              <span className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[12.5px] font-semibold leading-tight text-brand-600 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-400">{totalItems}</span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] font-medium leading-tight text-slate-500 dark:text-slate-400">Gérez vos ressources humaines et vos paiements.</p>
        </div>

        <div className="relative z-10 flex w-full shrink-0 items-center gap-2 md:w-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-500 transition-colors hover:border-brand-500/20 hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${borderColor} ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}
              aria-label="Actualiser les employés"
              title="Actualiser"
            >
              <RefreshCw size={16} strokeWidth={2.2} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}

          {/* ⭐ NOUVEAU: Bouton Historique (nafindra avy amin'ny EmployesCalendrier) */}
          {onOpenHistorique && (
            <button
              type="button"
              onClick={onOpenHistorique}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3.5 text-[14px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-500/30 hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100 ${borderColor} ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}
              aria-label="Voir l'historique des présences"
              title="Historique des présences"
            >
              <History size={16} strokeWidth={2.2} />
              <span>Historique</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddEmploye}
            className="inline-flex h-9 flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-brand-500 px-3.5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 active:scale-[0.98]"
            aria-label="Ajouter un employé"
          >
            <Plus size={17} strokeWidth={2.2} />
            <span>Nouvel employé</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default EmployesHeader;