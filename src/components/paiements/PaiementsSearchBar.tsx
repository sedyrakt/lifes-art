// src/components/paiements/PaiementsSearchbar.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur CommandesTable
// ⭐ fontSize : header 12px, cells 13.5px, footer 12.5px
// ⭐ NOUVEAU: Nesorina daholo ny icon rehetra (Search, X, ArrowUpDown, List, Grid)

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface PaiementsSearchbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterMois: number;
  onFilterMoisChange: (value: number) => void;
  filterAnnee: number;
  onFilterAnneeChange: (value: number) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  moisLabels: string[];
  annees: number[];
}

const PaiementsSearchbar: React.FC<PaiementsSearchbarProps> = ({
  searchTerm, onSearchChange, filterMois, onFilterMoisChange, filterAnnee, onFilterAnneeChange,
  sortOption, onSortChange, viewMode, onViewModeChange, moisLabels, annees,
}) => {
  const { isDark } = useTheme();
  
  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-200';
  const bgColor = isDark ? 'bg-[#0F172A]' : 'bg-white';
  const textColor = isDark ? 'text-slate-100' : 'text-slate-900';
  const placeholderColor = isDark ? 'dark:placeholder:text-slate-500' : 'placeholder:text-slate-400';

  const inputClass = `h-10 rounded-lg border text-[13.5px] outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 ${bgColor} ${borderColor} ${textColor}`;

  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* ⭐ Nesorina ny Search icon — input fotsiny */}
      <div className="relative w-full lg:flex-1 lg:max-w-[520px]">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un paiement..."
          className={`w-full h-10 pl-3.5 pr-10 ${inputClass} ${placeholderColor}`}
        />
        {/* ⭐ Nesorina ny X icon — bokotra tsotra misy soratra "×" */}
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-md text-slate-400 text-[16px] font-bold transition-colors hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
            aria-label="Effacer la recherche"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filterMois}
          onChange={(e) => onFilterMoisChange(Number(e.target.value))}
          className={`${inputClass} min-w-[110px] px-3 cursor-pointer`}
        >
          <option value={0}>Tous les mois</option>
          {moisLabels.map((mois, index) => (
            <option key={mois} value={index + 1}>{mois}</option>
          ))}
        </select>

        <select
          value={filterAnnee}
          onChange={(e) => onFilterAnneeChange(Number(e.target.value))}
          className={`${inputClass} min-w-[100px] px-3 cursor-pointer`}
        >
          <option value={0}>Toutes les années</option>
          {annees.map((annee) => (
            <option key={annee} value={annee}>{annee}</option>
          ))}
        </select>

        {/* ⭐ Nesorina ny ArrowUpDown icon */}
        <select
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value)}
          className={`${inputClass} min-w-[140px] px-3 cursor-pointer`}
        >
          <option value="date-desc">Date (Récent)</option>
          <option value="date-asc">Date (Ancien)</option>
          <option value="montant-desc">Montant ↓</option>
          <option value="montant-asc">Montant ↑</option>
        </select>

        {/* ⭐ Nesorina ny List sy Grid icon — bokotra tsotra misy soratra */}
        <div className={`flex items-center h-10 p-1 rounded-lg border ${bgColor} ${borderColor}`}>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`flex items-center justify-center px-3 h-8 rounded-md text-[13px] font-semibold transition-colors ${
              viewMode === 'table'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
            title="Vue tableau"
            aria-label="Vue tableau"
          >
            Tableau
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`flex items-center justify-center px-3 h-8 rounded-md text-[13px] font-semibold transition-colors ${
              viewMode === 'grid'
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
            title="Vue grille"
            aria-label="Vue grille"
          >
            Grille
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaiementsSearchbar;