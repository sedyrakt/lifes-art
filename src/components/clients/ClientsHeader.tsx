// ClientsHeader.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FIX: ESORINA ny bouton "Exporter" sy ny menu export rehetra
// ⭐ fontSize : header 12px, cells 13.5px, footer 12.5px

import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ClientsHeaderProps {
  onAddClient: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  totalItems?: number;
}

const ClientsHeader: React.FC<ClientsHeaderProps> = ({
  onAddClient,
  refreshing = false,
  onRefresh,
  isLoading = false,
  totalItems,
}) => {
  const { isDark } = useTheme();
  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-200';

  return (
    <header className="mb-4 w-full relative z-[100]">
      <div className={`group relative flex flex-col gap-3 rounded-xl border-[0.5px] shadow-sm transition-colors duration-200 md:flex-row md:items-center md:justify-between px-3 py-2 ${isDark ? 'bg-[#0F172A]' : 'bg-white'} ${borderColor}`}>
        <div className="absolute left-0 top-0 h-full w-[2px] bg-brand-500" />

        <div className="relative z-10 flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-slate-100">Clients</h1>
            {totalItems !== undefined && (
              <span className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[11.5px] font-semibold leading-tight text-brand-600 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-400">{totalItems}</span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] font-medium leading-tight text-slate-500 dark:text-slate-400">Gérez votre carnet d'adresses clients.</p>
        </div>

        <div className="relative z-10 flex w-full shrink-0 items-center gap-2 md:w-auto">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${borderColor} ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}
              aria-label="Actualiser les clients"
              title="Actualiser"
            >
              <RefreshCw size={15} strokeWidth={2.2} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}

          {/* ⭐ ESORINA tanteraka: bouton "Exporter" + menu export */}

          <button
            type="button"
            onClick={onAddClient}
            className="inline-flex h-9 flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg bg-brand-500 px-3.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 active:scale-[0.98]"
            aria-label="Ajouter un client"
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Nouveau client</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ClientsHeader;