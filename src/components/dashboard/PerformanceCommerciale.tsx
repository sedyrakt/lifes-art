// LIFE'S ART
// src/components/dashboard/PerformanceCommerciale.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ 8 KPIs (CA + Bénéfice + Dépenses + Achats + Salaires + Commandes + Clients + Panier moyen)
// ⭐ 4 colonnes — mameno 100% ny sakany (2 lignes: 4 + 4)
// ⭐ Uniform card height amin'ny alalan'ny h-full
// ⭐ FIX: Mampiasa 'title' fa tsy 'label' (mifanaraka amin'ny useDashboardKPIs)
// ⭐ FIX: Alefa ny 'tooltip' any amin'ny KpiCard
// ⭐ FIX: Support rétro-compat amin'ny 'label' (raha misy ancien)

import React from 'react';
import { KpiCard } from './KpiCard';
import { SectionHeading } from './SectionHeading';

// ⭐ Type mifanaraka amin'ny KpiItem avy amin'ny useDashboardKPIs
interface Kpi {
  key?: string;
  title?: string;
  label?: string; // ⭐ LEGACY — support rétro-compat
  value: number;
  variation?: number | null;
  money?: boolean;
  negative?: boolean;
  showSign?: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sparklineColor?: string;
  sparkline?: number[];
  unit?: string;
  tooltip?: string;
}

interface PerformanceCommercialeProps {
  kpisVentes: Kpi[];
  variationLabel: string;
}

export const PerformanceCommerciale: React.FC<PerformanceCommercialeProps> = ({
  kpisVentes,
  variationLabel,
}) => (
  <section className="relative z-0 mb-4 w-full">
    <SectionHeading
      title="Performance commerciale"
      accent="emerald"
      subtitle="Vue synthétique de l'activité"
    />

    {/* ⭐ 4 colonnes — mameno 100% ny sakany, mizara ho 2 lignes raha > 4 KPI */}
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpisVentes.map((kpi, index) => {
        // ⭐ Support 'title' (nouveau) na 'label' (ancien)
        const displayTitle = kpi.title ?? kpi.label ?? `KPI ${index + 1}`;
        const kpiKey = kpi.key ?? `ventes-${index}`;

        return (
          <div key={kpiKey} className="h-full">
            <KpiCard
              title={displayTitle}
              value={kpi.value}
              variation={kpi.variation ?? null}
              variationLabel={variationLabel}
              money={kpi.money ?? false}
              negative={kpi.negative ?? false}
              showSign={kpi.showSign ?? false}
              sparklineColor={kpi.sparklineColor ?? '#6366F1'}
              sparkline={Array.isArray(kpi.sparkline) ? kpi.sparkline : []}
              icon={kpi.icon}
              iconBg={kpi.iconBg}
              iconColor={kpi.iconColor}
              unit={kpi.unit}
              tooltip={kpi.tooltip} // ⭐ FIX: Alefa ny tooltip
            />
          </div>
        );
      })}
    </div>
  </section>
);

export default PerformanceCommerciale;