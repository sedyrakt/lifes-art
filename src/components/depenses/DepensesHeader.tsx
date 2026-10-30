// src/components/depenses/DepensesHeader.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur CommandesTable
// ⭐ NOUVEAU: Period selector intégré (Ce mois / Mois dernier / Cette année / Tout)
//            → hampifanaraka ny stats amin'ny Dashboard
// ⭐ FIX: ESORINA ny bouton "Exporter" sy ny menu export rehetra

import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// ⭐ StatsPeriod type
export type StatsPeriod = 'ce_mois' | 'mois_dernier' | 'cette_annee' | 'tout';

// ⭐ Options ho an'ny stats period
const STATS_PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: 'ce_mois', label: 'Ce mois' },
  { value: 'mois_dernier', label: 'Mois dernier' },
  { value: 'cette_annee', label: 'Cette année' },
  { value: 'tout', label: 'Tout' },
];

interface DepensesHeaderProps {
  onAddDepense: () => void;
  onOpenStats?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  totalItems?: number;
  // ⭐ Stats period ho an'ny filtre visible
  statsPeriod?: StatsPeriod;
  onStatsPeriodChange?: (period: StatsPeriod) => void;
}

const DepensesHeader: React.FC<DepensesHeaderProps> = ({
  onAddDepense,
  onOpenStats,
  refreshing = false,
  onRefresh,
  totalItems,
  statsPeriod = 'tout',
  onStatsPeriodChange,
}) => {
  const { isDark } = useTheme();
  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-200';

  return (
    <header className="mb-4 w-full relative z-[100]">
      <div className={`group relative flex flex-col gap-3 rounded-xl border-[0.5px] shadow-sm transition-colors duration-200 md:flex-row md:items-center md:justify-between px-3 py-2 ${isDark ? 'bg-[#0F172A]' : 'bg-white'} ${borderColor}`}>
        <div className="absolute left-0 top-0 h-full w-[2px] bg-brand-500" />

        {/* ⭐ Titre + Description */}
        <div className="relative z-10 flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-slate-100">Dépenses</h1>
            {totalItems !== undefined && (
              <span className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[11.5px] font-semibold leading-tight text-brand-600 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-400">{totalItems}</span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] font-medium leading-tight text-slate-500 dark:text-slate-400">Suivez et gérez les dépenses de votre entreprise.</p>
        </div>

        {/* ⭐ Actions + Period Selector */}
        <div className="relative z-10 flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto">

          {/* ⭐⭐⭐ Period Selector ⭐⭐⭐ */}
          {onStatsPeriodChange && (
            <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${isDark ? 'border-white/[0.12] bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
              {STATS_PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onStatsPeriodChange(opt.value)}
                  className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-all ${
                    statsPeriod === opt.value
                      ? 'bg-brand-500 text-white shadow-sm'
                      : isDark
                        ? 'text-slate-300 hover:bg-white/[0.06]'
                        : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${borderColor} ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}
              aria-label="Actualiser les dépenses"
              title="Actualiser"
            >
              <RefreshCw size={15} strokeWidth={2.2} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}

          {/* ⭐ ESORINA tanteraka: bouton "Exporter" + menu export */}

          <button
            type="button"
            onClick={onAddDepense}
            className="inline-flex h-9 flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-brand-500 px-3.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 active:scale-[0.98]"
            aria-label="Nouvelle dépense"
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Nouvelle dépense</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DepensesHeader;