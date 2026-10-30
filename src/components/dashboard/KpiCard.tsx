// src/components/dashboard/KpiCard.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FIX: Layout mitovy amin'i Kajy — Icon TOP-RIGHT, Label TOP-LEFT
// ⭐ FIX: Sparkline kely sy manify eo amin'ny BOTTOM-RIGHT (~60×26px)
// ⭐ FIX: Tsy misy truncate — aseho feno ny soratra

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from './Sparkline';
import { safeNumber, safeVariation } from './utils/variation';
import { formatAriary, formatNumber } from './utils/formatters';

interface KpiCardProps {
  title: string;
  value: number;
  variation?: number | null;
  variationLabel?: string;
  sparkline: number[];
  sparklineColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  money?: boolean;
  negative?: boolean;
  showSign?: boolean;
  unit?: string;
  tooltip?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title, value, variation, variationLabel = 'vs mois dernier',
  sparkline, sparklineColor, icon, iconBg, iconColor,
  money = false, negative = false, showSign = false, unit,
  tooltip,
}) => {
  const numericValue = safeNumber(value);
  const displayValue = money ? formatAriary(numericValue, showSign) : formatNumber(numericValue);
  const hasVariation = variation !== null && variation !== undefined && Number.isFinite(Number(variation));
  const variationNumber = safeVariation(variation);
  const variationPositive = safeNumber(variationNumber) >= 0;

  const isGood = negative ? !variationPositive : variationPositive;
  const variationColor = isGood
    ? 'text-emerald-500 dark:text-emerald-400'
    : 'text-red-500 dark:text-red-400';

  const variationAbs = Math.abs(variationNumber ?? 0);
  const isExtreme = variationAbs >= 999;

  return (
    <div
      className="group relative flex min-h-[110px] flex-col justify-between overflow-hidden rounded-xl border-[0.5px] border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors duration-200 hover:border-brand-500/30 dark:border-white/[0.12] dark:bg-[#0F172A] dark:hover:border-brand-500/30"
      title={tooltip || title}
    >
      {/* Top accent color amin'ny hover */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ backgroundColor: sparklineColor }}
      />

      {/* ═══ HEADER: Label (left) + Icon (right) ═══ */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase leading-[1.35] tracking-[0.06em] text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
      </div>

      {/* ═══ VALEUR + VARIATION ═══ */}
      <div className="relative z-10 mt-1">
        <p
          className={`whitespace-nowrap text-[19px] font-bold leading-[1.2] tracking-tight ${
            numericValue < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
          }`}
          title={displayValue}
        >
          {displayValue}
          {unit && (
            <span className="ml-1 text-[14px] font-medium leading-[1.2] text-slate-400 dark:text-slate-500">
              {unit}
            </span>
          )}
        </p>

        {hasVariation && variationNumber !== null && (
          <p className="mt-1 flex items-center gap-1 whitespace-nowrap text-[11.5px] leading-[1.35]">
            {isExtreme ? (
              <span className="font-semibold text-slate-400 dark:text-slate-500">N/A</span>
            ) : (
              <span className={`inline-flex items-center gap-0.5 font-semibold ${variationColor}`}>
                {variationPositive ? (
                  <TrendingUp size={11} strokeWidth={2.4} />
                ) : (
                  <TrendingDown size={11} strokeWidth={2.4} />
                )}
                {variationPositive ? '+' : ''}
                {variationNumber.toFixed(1)}%
              </span>
            )}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              {variationLabel}
            </span>
          </p>
        )}
      </div>

      {/* ═══ SPARKLINE — kely sy manify, BOTTOM-RIGHT ═══ */}
      <div
        className="pointer-events-none absolute bottom-2.5 right-3 z-0 h-[26px] w-[70px] opacity-95"
        aria-hidden="true"
      >
        <Sparkline data={sparkline} color={sparklineColor} height={26} />
      </div>
    </div>
  );
};