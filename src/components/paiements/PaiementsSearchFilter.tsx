// src/components/paiements/PaiementsSearchFilter.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur CommandesTable
// ⭐ NOUVEAU: Nesorina ny icon rehetra (ViewButton)
// ⭐ NOUVEAU: Nesorina TANTERAKA ny panneau filtres (Employé, Période, Statut)
// ⭐ FIX: NESORINA ny bouton "Échéances" — tsy ampiasaina intsony

import React from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ViewButton } from './ViewButton';
import type { EmployePaiement } from './PaiementsModalForm';

// ⭐ NESORINA: 'echeances' avy amin'ny ViewMode
type ViewMode = 'liste' | 'calendrier' | 'bulletin';
type StatutFilter = 'Tous' | 'Brouillon' | 'Payé' | 'Non payé';

interface PaiementsSearchFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  employeeFilter: number | '';
  setEmployeeFilter: (value: number | '') => void;
  monthFilter: number | '';
  setMonthFilter: (value: number | '') => void;
  yearFilter: number | '';
  setYearFilter: (value: number | '') => void;
  statutFilter: StatutFilter;
  setStatutFilter: (value: StatutFilter) => void;
  employes: EmployePaiement[];
  yearOptions: number[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
}

export function PaiementsSearchFilter({
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
}: PaiementsSearchFilterProps) {
  const { isDark } = useTheme();

  return (
    <>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search size={15} strokeWidth={2.2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un employé ..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-white/[0.12] dark:bg-[#0F172A] dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        {/* ⭐ View Buttons — tsy misy icon, tsy misy "Échéances" */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-white/[0.12] dark:bg-[#0F172A]">
          <ViewButton active={viewMode === 'liste'} label="Liste" onClick={() => setViewMode('liste')} />
          <ViewButton active={viewMode === 'calendrier'} label="Calendrier" onClick={() => setViewMode('calendrier')} />
          {/* ⭐ NESORINA: <ViewButton active={viewMode === 'echeances'} label="Échéances" ... /> */}
          <ViewButton active={viewMode === 'bulletin'} label="Bulletins" onClick={() => setViewMode('bulletin')} />
        </div>
      </div>

      {/* ⭐ Nesorina tanteraka ny panneau filtres (showFilters) */}
    </>
  );
}