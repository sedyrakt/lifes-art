// src/components/depenses/DepensesStats.tsx
// ⭐ FIX: `nb` (période) priorisé sur `totalItems` (global)
// ⭐ FIX: moyenne arrondie à 2 décimales
// ⭐ FIX: badge période garde son rôle

import React from 'react';
import { TrendingDown, TrendingUp, FileText, DollarSign, Building, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface DepensesStatsProps {
  total: number;
  nb: number;
  moyenne: number;
  nbFournisseurs: number;
  totalItems?: number;
  evolutionTotal?: number;
  evolutionNb?: number;
  evolutionMoyenne?: number;
  evolutionFournisseurs?: number;
  refreshing?: boolean;
  periodLabel?: string;
}

const safeNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

// ⭐ Format money 2 décimales (évite "132 340,426")
const formatMoney = (value: number, withDecimals = false): string => {
  const n = safeNumber(value);
  if (!withDecimals) return `${Math.round(n).toLocaleString('fr-FR')} Ar`;
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ar`;
};

const STAT_ACCENTS = {
  total: { iconBg: 'bg-red-50 dark:bg-red-500/10', iconColor: 'text-red-600 dark:text-red-400', accent: '#EF4444' },
  nb: { iconBg: 'bg-indigo-50 dark:bg-indigo-500/10', iconColor: 'text-indigo-600 dark:text-indigo-400', accent: '#6366F1' },
  moyenne: { iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400', accent: '#10B981' },
  fournisseurs: { iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400', accent: '#F59E0B' },
};

const DepensesStats: React.FC<DepensesStatsProps> = ({
  total, nb, moyenne, nbFournisseurs, totalItems,
  evolutionTotal = 0, evolutionNb = 0, evolutionMoyenne = 0, evolutionFournisseurs = 0,
  refreshing = false, periodLabel
}) => {
  const { isDark } = useTheme();

  // ⭐⭐⭐ FIX: `nb` priorisé, `totalItems` utilisé UNIQUEMENT si nb===0 et totalItems>0
  const safeNb = safeNumber(nb);
  const safeTotalItems = safeNumber(totalItems);
  const displayNb = safeNb > 0
    ? safeNb
    : (safeTotalItems > 0 ? safeTotalItems : 0);

  const formattedTotal = formatMoney(total);        // entier (pas de décimales)
  const formattedMoyenne = formatMoney(moyenne, true); // 2 décimales

  const stats = [
    { key: 'total', label: 'Total Dépenses', value: formattedTotal, evolution: safeNumber(evolutionTotal), icon: TrendingDown, showPeriod: true },
    { key: 'nb', label: 'Nombre', value: displayNb.toLocaleString('fr-FR'), evolution: safeNumber(evolutionNb), icon: FileText, showPeriod: false },
    { key: 'moyenne', label: 'Moyenne', value: formattedMoyenne, evolution: safeNumber(evolutionMoyenne), icon: DollarSign, showPeriod: false },
    { key: 'fournisseurs', label: 'Fournisseurs', value: safeNumber(nbFournisseurs).toLocaleString('fr-FR'), evolution: safeNumber(evolutionFournisseurs), icon: Building, showPeriod: false },
  ];

  return (
    <div className="relative mb-4">
      {refreshing && (
        <div className={`absolute right-0 top-0 z-10 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 shadow-sm animate-pulse ${
          isDark ? 'border-white/[0.12] bg-[#0F172A] text-brand-400' : 'border-slate-200 bg-white text-brand-600'
        }`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          <span className="text-[12px] font-semibold uppercase tracking-wider">Mise à jour...</span>
        </div>
      )}

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const accent = STAT_ACCENTS[stat.key as keyof typeof STAT_ACCENTS];
          const hasEvolution = stat.evolution !== 0;
          const isPositive = stat.evolution > 0;
          const isGood = !isPositive;
          const variationColor = isGood ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400';

          return (
            <div
              key={stat.key}
              className="group relative flex min-h-[95px] flex-col overflow-hidden rounded-xl border-[0.5px] border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors duration-200 hover:border-brand-500/30 dark:border-white/[0.12] dark:bg-[#0F172A] dark:hover:border-brand-500/30"
            >
              <div
                className="absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: accent.accent }}
              />

              <div className="flex min-w-0 items-start gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.iconBg} ${accent.iconColor} transition-transform duration-200 group-hover:scale-105`}>
                  <Icon size={20} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[12px] font-semibold uppercase leading-[1.4] tracking-[0.07em] text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </p>
                    {stat.showPeriod && periodLabel && (
                      <span className="inline-flex shrink-0 items-center rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-400">
                        {periodLabel}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-[20px] font-bold leading-[1.3] tracking-tight text-slate-900 dark:text-slate-100" title={String(stat.value)}>
                    {stat.value}
                  </p>

                  {hasEvolution && (
                    <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[13px] leading-[1.4]">
                      <span className={`inline-flex items-center gap-0.5 font-semibold ${variationColor}`}>
                        {isPositive ? <TrendingUp size={13} strokeWidth={2.4} /> : <TrendingDown size={13} strokeWidth={2.4} />}
                        {isPositive ? '+' : ''}
                        {stat.evolution.toFixed(1)}%
                      </span>
                      <span className="truncate font-normal text-slate-400 dark:text-slate-500">vs période précédente</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DepensesStats;