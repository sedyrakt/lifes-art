// src/components/paiements/StatusBadge.tsx
// ⭐ NESORINA ny "Partiel" (legacy — tsy ampiasain'ny logic vaovao)
// ⭐ Statut telo ihany: Brouillon / Payé / Non payé
// ⭐ INDIGO + SLATE — aligné amin'ny design system

import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const normalized = String(status || 'Non payé').trim();

  const styles = (() => {
    switch (normalized) {
      case 'Payé':
        return {
          wrapper: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25',
          icon: <CheckCircle2 size={size === 'sm' ? 11 : 12} strokeWidth={2.5} />,
          label: 'Payé',
        };
      case 'Brouillon':
        return {
          wrapper: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/[0.05] dark:text-slate-400 dark:border-white/[0.12]',
          icon: <Clock size={size === 'sm' ? 11 : 12} strokeWidth={2.5} />,
          label: 'Brouillon',
        };
      case 'Non payé':
      default:
        return {
          wrapper: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/25',
          icon: <XCircle size={size === 'sm' ? 11 : 12} strokeWidth={2.5} />,
          label: 'Non payé',
        };
    }
  })();

  const sizeClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-[11.5px] gap-1'
    : 'px-2 py-0.5 text-[12.5px] gap-1.5';

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded border font-semibold leading-tight ${sizeClass} ${styles.wrapper} ${className}`}
    >
      {showIcon && styles.icon}
      {styles.label}
    </span>
  );
}

export default StatusBadge;