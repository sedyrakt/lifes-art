// src/components/employes/EmployesSearchBar.tsx
// ⭐ NOUVEAU: Nesorina tanteraka ny bouton "Filtres" sy ny panneau filtres
// ⭐ NOUVEAU: Nesorina ny icon amin'ny bouton Liste / Calendrier

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface EmployesSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  viewMode: 'liste' | 'calendrier';
  onViewModeChange: (mode: 'liste' | 'calendrier') => void;
}

const EmployesSearchBar: React.FC<EmployesSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  isLoading = false,
  viewMode,
  onViewModeChange,
}) => {
  const { isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  if (isLoading) return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="flex-1 min-w-[220px] h-10 rounded-xl bg-slate-100 dark:bg-white/[0.08] animate-pulse" />
        <div className="w-[220px] h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-white/[0.08] animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center gap-2.5 w-full flex-nowrap overflow-x-auto overflow-y-hidden pb-1 scrollbar-none">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] shrink">
          <Search
            size={17}
            strokeWidth={1.9}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
              isFocused ? 'text-brand-500' : 'text-brand-500 dark:text-brand-400'
            }`}
          />
          <input
            type="text"
            value={searchTerm}
            placeholder="Rechercher un employé ..."
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full h-10 rounded-xl border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] pl-9 pr-9 text-[14px] font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all duration-200 hover:border-slate-300 dark:hover:border-white/[0.18] focus:border-brand-500 dark:focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:focus:ring-brand-400/10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-brand-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* View mode toggle — tsy misy icon */}
        <div className="flex shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-white/[0.12] dark:bg-[#0F172A]">
          <button
            type="button"
            onClick={() => onViewModeChange('liste')}
            className={`flex h-8 items-center rounded-lg px-3.5 text-[14px] font-semibold transition-all ${
              viewMode === 'liste'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200'
            }`}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('calendrier')}
            className={`flex h-8 items-center rounded-lg px-3.5 text-[14px] font-semibold transition-all ${
              viewMode === 'calendrier'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200'
            }`}
          >
            Calendrier
          </button>
        </div>

        {/* ⭐ Nesorina tanteraka ny bouton "Filtres" eto */}
      </div>

      {/* ⭐ Nesorina tanteraka ny panneau filtres (Tous / Département / Nom A-Z / Réinitialiser) */}

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default EmployesSearchBar;