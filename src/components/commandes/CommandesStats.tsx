// src/components/commandes/CommandesStats.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FIX: Badge période (TOUT / CE MOIS / sns.) → amin'ny "CA total" (fa tsy "Total commandes")
// ⭐ FIX: CA total aloha, aorian'izany Total commandes

import React from 'react';
import { Loader2, TrendingUp, TrendingDown, FileText, DollarSign, Package, Wallet } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface CommandesStatsProps {
  total: number;
  totalCA: number;
  totalItems?: number;
  evolutionTotal?: number;
  evolutionCA?: number;
  evolutionItems?: number;

  totalDette?: number;
  nbCommandesNonPayees?: number;
  evolutionDette?: number;

  refreshing?: boolean;
  periodLabel?: string;
}

const safeNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const STAT_ACCENTS = {
  total: {
    iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    accent: '#6366F1',
  },
  ca: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accent: '#10B981',
  },
  articles: {
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accent: '#F59E0B',
  },
  dette: {
    iconBg: 'bg-red-50 dark:bg-red-500/10',
    iconColor: 'text-red-600 dark:text-red-400',
    accent: '#EF4444',
  },
};

const CommandesStats: React.FC<CommandesStatsProps> = ({
  total,
  totalCA,
  totalItems = 0,
  evolutionTotal = 0,
  evolutionCA = 0,
  evolutionItems = 0,

  totalDette = 0,
  nbCommandesNonPayees = 0,
  evolutionDette = 0,

  refreshing = false,
  periodLabel,
}) => {
  const { isDark } = useTheme();

  const formattedCA = `${safeNumber(totalCA).toLocaleString('fr-FR')} Ar`;
  const formattedDette = `${safeNumber(totalDette).toLocaleString('fr-FR')} Ar`;
  const totalNonPayees = safeNumber(nbCommandesNonPayees).toLocaleString('fr-FR');
  const hasNonPayees = nbCommandesNonPayees > 0;

  // ⭐⭐⭐ FIX: CA total ALOHA + badge période amin'ny CA total ⭐⭐⭐
  const stats = [
    {
      key: 'ca',
      label: 'CA total',
      value: formattedCA,
      evolution: safeNumber(evolutionCA),
      badge: null,
      danger: false,
      icon: DollarSign,
      showPeriod: true,           // ⭐ Badge période amin'ny CA total
    },
    {
      key: 'total',
      label: 'Total commandes',
      value: safeNumber(total).toLocaleString('fr-FR'),
      evolution: safeNumber(evolutionTotal),
      badge: null,
      danger: false,
      icon: FileText,
      showPeriod: false,          // ⭐ Esorina amin'ny Total commandes
    },
    {
      key: 'articles',
      label: 'Articles vendus',
      value: safeNumber(totalItems).toLocaleString('fr-FR'),
      evolution: safeNumber(evolutionItems),
      badge: null,
      danger: false,
      icon: Package,
      showPeriod: false,
    },
    {
      key: 'dette',
      label: 'Dette Clients',
      value: formattedDette,
      evolution: safeNumber(evolutionDette),
      badge: hasNonPayees ? `${totalNonPayees} commande(s) avec dette` : null,
      danger: hasNonPayees,
      icon: Wallet,
      showPeriod: false,
    },
  ];

  return (
    <div className="relative mb-4">
      {refreshing && (
        <div className={`absolute right-0 top-0 z-10 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 shadow-sm animate-pulse ${
          isDark
            ? 'border-white/[0.12] bg-[#0F172A] text-brand-400'
            : 'border-slate-200 bg-white text-brand-600'
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
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.iconBg} ${accent.iconColor} transition-transform duration-200 group-hover:scale-105`}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  {/* ⭐ Label + Period badge (raha misy) */}
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

                  <p
                    className="mt-1 truncate text-[20px] font-bold leading-[1.3] tracking-tight text-slate-900 dark:text-slate-100"
                    title={String(stat.value)}
                  >
                    {stat.value}
                  </p>

                  {stat.badge && (
                    <p className="mt-0.5">
                      <span
                        className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                          stat.danger
                            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                            : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                        }`}
                      >
                        {stat.badge}
                      </span>
                    </p>
                  )}

                  {hasEvolution && !stat.badge && (
                    <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[13px] leading-[1.4]">
                      <span
                        className={`inline-flex items-center gap-0.5 font-semibold ${
                          isPositive
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp size={13} strokeWidth={2.4} />
                        ) : (
                          <TrendingDown size={13} strokeWidth={2.4} />
                        )}
                        {isPositive ? '+' : ''}
                        {stat.evolution.toFixed(1)}%
                      </span>
                      <span className="truncate font-normal text-slate-400 dark:text-slate-500">
                        vs période précédente
                      </span>
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

export default CommandesStats;