// src/components/rapports/RapportsSummary.tsx
// ⭐ FIX: "Nombre de clients" → "Clients actifs"
// ⭐ FIX: Bénéfice net misy filtre période
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur SectionCard / Stats components
// ⭐ FONT SIZE: h2 15px, subtitle 13px, labels 14px, values 14px
// ⭐ NOUVEAU: Salaires en attente (ambiny tokony aloa)

import React from 'react';
import { ClipboardList, TrendingUp, ArrowUp, ArrowDown, Target, Users, ArrowUpRight, ArrowDownRight, DollarSign, Clock } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface RapportsSummaryProps {
  stats: {
    chiffreAffaires: number;
    totalEntrees: number;
    totalSorties: number;
    benefice: number;
    nbClients: number;
  };
  formatMoney: (value: number) => string;
  /** ⭐ NOUVEAU: Salaires en attente (avy amin'ny beneficeData) */
  salairesEnAttente?: number;
  /** ⭐ NOUVEAU: Isan'ny paiements en attente */
  nbPaiementsEnAttente?: number;
}

const RapportsSummary: React.FC<RapportsSummaryProps> = ({
  stats,
  formatMoney,
  salairesEnAttente = 0,
  nbPaiementsEnAttente = 0,
}) => {
  const { isDark } = useTheme();
  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-200';
  const cardBg = isDark ? 'bg-[#0F172A]' : 'bg-white';
  const shadow = isDark ? 'shadow-[0_12px_40px_rgba(0,0,0,0.18)]' : 'shadow-[0_1px_2px_rgba(79,70,229,0.04)]';

  const ratio = stats.chiffreAffaires > 0 ? (stats.benefice / stats.chiffreAffaires) * 100 : 0;
  const ratioFormatted = ratio.toFixed(2);
  const beneficePositif = stats.benefice >= 0;
  const hasSalairesEnAttente = salairesEnAttente > 0;

  const rows = [
    {
      key: 'ca',
      title: "Chiffre d'affaires",
      subtitle: 'Montant total des ventes',
      value: formatMoney(stats.chiffreAffaires),
      icon: TrendingUp,
      iconBg: 'bg-brand-500/[0.10] text-brand-500',
      valueColor: 'text-slate-900 dark:text-slate-100'
    },
    {
      key: 'entrees',
      title: 'Total entrées',
      subtitle: 'Mouvements entrants',
      value: stats.totalEntrees.toLocaleString('fr-FR'),
      icon: ArrowUp,
      iconBg: 'bg-emerald-500/[0.10] text-emerald-500',
      valueColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      key: 'sorties',
      title: 'Total sorties',
      subtitle: 'Mouvements sortants',
      value: stats.totalSorties.toLocaleString('fr-FR'),
      icon: ArrowDown,
      iconBg: 'bg-red-500/[0.10] text-red-500',
      valueColor: 'text-red-600 dark:text-red-400'
    },
    {
      key: 'ratio',
      title: 'Ratio bénéfice / ventes',
      subtitle: 'Performance globale',
      value: `${ratioFormatted}%`,
      icon: Target,
      iconBg: beneficePositif ? 'bg-emerald-500/[0.10] text-emerald-500' : 'bg-red-500/[0.10] text-red-500',
      valueColor: beneficePositif ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
    },
    {
      key: 'clients',
      title: 'Clients actifs',
      subtitle: 'Clients ayant commandé',
      value: stats.nbClients.toLocaleString('fr-FR'),
      icon: Users,
      iconBg: 'bg-slate-500/[0.10] text-slate-400',
      valueColor: 'text-slate-900 dark:text-slate-100'
    },
    // ⭐⭐⭐ NOUVEAU: Salaires en attente ⭐⭐⭐
    {
      key: 'salaires_en_attente',
      title: 'Salaires en attente',
      subtitle: nbPaiementsEnAttente > 0
        ? `${nbPaiementsEnAttente} paiement${nbPaiementsEnAttente > 1 ? 's' : ''} à régler`
        : 'Aucun paiement en attente',
      value: hasSalairesEnAttente ? formatMoney(salairesEnAttente) : '0 Ar',
      icon: Clock,
      iconBg: hasSalairesEnAttente ? 'bg-amber-500/[0.10] text-amber-500' : 'bg-slate-500/[0.10] text-slate-400',
      valueColor: hasSalairesEnAttente ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
    },
  ];

  return (
    <div className={`relative h-full overflow-hidden rounded-xl border-[0.5px] ${borderColor} ${cardBg} ${shadow}`}>
      <div className="relative">
        <div className={`flex items-center justify-between border-b ${borderColor} px-4 py-3`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
              <ClipboardList size={17} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold leading-tight text-slate-900 dark:text-slate-100">Résumé financier</h2>
              <p className="mt-0.5 text-[13px] leading-tight text-slate-500 dark:text-slate-400">Synthèse des indicateurs</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-[12.5px] font-medium text-brand-500 dark:text-brand-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            À jour
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.key} className={`flex items-center justify-between gap-3 border-b ${borderColor} pb-3 last:border-b-0 last:pb-0`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${row.iconBg}`}>
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-[1.3] text-slate-900 dark:text-slate-200">{row.title}</p>
                    <p className="mt-0.5 truncate text-[12.5px] leading-[1.3] text-slate-500 dark:text-slate-400">{row.subtitle}</p>
                  </div>
                </div>

                <span className={`shrink-0 text-[14px] font-semibold ${row.valueColor}`}>{row.value}</span>
              </div>
            );
          })}
        </div>

        <div className={`mx-4 mb-4 p-3.5 rounded-lg border ${beneficePositif ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${beneficePositif ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                <DollarSign size={15} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold leading-tight text-slate-900 dark:text-slate-100">Bénéfice net</div>
                <div className="text-[12.5px] leading-tight text-slate-500 dark:text-slate-400">CA − Dépenses − Achats − Salaires</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`text-[15px] font-bold tracking-tight ${beneficePositif ? 'text-emerald-500' : 'text-red-500'}`}>{formatMoney(stats.benefice)}</span>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${beneficePositif ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {beneficePositif ? <ArrowUpRight size={13} strokeWidth={2.5} /> : <ArrowDownRight size={13} strokeWidth={2.5} />}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RapportsSummary;