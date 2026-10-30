// src/components/fournisseurs/FournisseursSearchBar.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FIX: Dropdown items mampiasa onMouseDown + stopPropagation
//         mba tsy hikatona ny menu alohan'ny click
// ⭐ FIX: Ref ho an'ny dropdown <ul> ao amin'ny Portal (sortMenuRef)
// ⭐ FIX: Fallback label "Nom (A-Z)" → "Plus récent"
// ⭐ FIX: ESORINA ny bouton "Table" (tsy miasa sy tsy ampiasaina)
// ⭐ FIX: NESORINA ny badge "Ctrl K" ao amin'ny search input

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowUpDown, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const SORT_OPTIONS = [
  { value: 'Nom (A-Z)',     label: 'Nom (A-Z)' },
  { value: 'Nom (Z-A)',     label: 'Nom (Z-A)' },
  { value: 'Date (Récent)', label: 'Plus récent' },
  { value: 'Date (Ancien)', label: 'Plus ancien' },
] as const;

interface FournisseursSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (option: string) => void;
}

interface MenuPosition { top?: number; bottom?: number; left?: number; right?: number; }

const FournisseursSearchBar: React.FC<FournisseursSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  sortOption,
  onSortChange,
}) => {
  const { isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ⭐ Dropdown state
  const [openSort, setOpenSort] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState<MenuPosition>({});
  const sortRef = useRef<HTMLDivElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const sortMenuRef = useRef<HTMLUListElement>(null);

  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-200';
  const backgroundColor = isDark ? 'bg-[#0F172A]' : 'bg-white';
  const inputTextColor = isDark ? 'text-slate-100' : 'text-slate-900';
  const selectSurface = isDark ? 'bg-[#0F172A]' : 'bg-white';

  // ⭐ Compute position
  const computeMenuPosition = (btnRef: React.RefObject<HTMLButtonElement>): MenuPosition => {
    if (!btnRef.current) return {};
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MENU_WIDTH = 180;
    const MENU_HEIGHT = 180;
    const position: MenuPosition = {};

    if (vh - rect.bottom < MENU_HEIGHT + 10 && rect.top > MENU_HEIGHT + 10) {
      position.bottom = vh - rect.top + 4;
    } else {
      position.top = rect.bottom + 4;
    }

    if (vw - rect.left < MENU_WIDTH + 10) {
      position.right = vw - rect.right;
    } else {
      position.left = rect.left;
    }
    return position;
  };

  const openSortMenu = () => {
    setSortMenuPos(computeMenuPosition(sortBtnRef));
    setOpenSort(true);
  };

  // ⭐ FIX: Close dropdown rehefa click ivelany na Escape
  useEffect(() => {
    if (!openSort) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideSort = (
        (sortRef.current && sortRef.current.contains(target)) ||
        (sortBtnRef.current && sortBtnRef.current.contains(target)) ||
        (sortMenuRef.current && sortMenuRef.current.contains(target))
      );
      if (!isInsideSort) setOpenSort(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenSort(false);
    };
    const handleResize = () => setOpenSort(false);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [openSort]);

  // ⭐ Keyboard shortcut Ctrl+K (mbola miasa ao ambadika)
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (isShortcut) { event.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        if (searchTerm) onSearchChange(''); else searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [searchTerm, onSearchChange]);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortOption)?.label || 'Plus récent';

  const handleSortSelect = (value: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSortChange(value);
    setOpenSort(false);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-2.5 xl:flex-row xl:items-center">
        <div className="relative min-w-[280px] flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search size={18} strokeWidth={2} className={`transition-colors duration-200 ${isFocused ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
          </div>
          {/* ⭐ FIX: NESORINA ny "Ctrl K" — pr-11 conditionnel */}
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`h-10 w-full rounded-lg border ${borderColor} ${backgroundColor} pl-10 ${searchTerm ? 'pr-11' : 'pr-3.5'} text-[14px] ${inputTextColor} placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none shadow-[0_1px_2px_rgba(79,70,229,0.04)] transition-all duration-200 ${isFocused ? 'border-brand-500 shadow-[0_0_0_3px_rgba(79,70,229,0.08)]' : 'hover:border-slate-300 dark:hover:border-white/[0.18]'}`}
          />
          {searchTerm && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ⭐ Custom Dropdown — Tri */}
          <div className="relative min-w-[170px]" ref={sortRef}>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-2.5">
              <ArrowUpDown size={15} strokeWidth={2} className="text-brand-500 dark:text-brand-400" />
            </div>
            <button
              ref={sortBtnRef}
              type="button"
              onClick={() => openSort ? setOpenSort(false) : openSortMenu()}
              aria-label="Trier les fournisseurs"
              aria-expanded={openSort}
              className={`h-10 w-full flex items-center justify-between rounded-lg border ${openSort ? 'border-brand-500 ring-2 ring-brand-500/10' : `${borderColor} hover:border-slate-300 dark:hover:border-white/[0.18]`} ${selectSurface} pl-9 pr-2.5 text-[14px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'} outline-none shadow-[0_1px_2px_rgba(79,70,229,0.04)] transition-all duration-200`}
            >
              <span className="truncate">{currentSortLabel}</span>
              <ChevronDown size={15} strokeWidth={2} className={`shrink-0 transition-transform duration-200 ${openSort ? 'rotate-180' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ⭐ Portal — Dropdown Tri */}
      {openSort && createPortal(
        <ul
          ref={sortMenuRef}
          className={`fixed z-[99999] w-[180px] rounded-lg border shadow-[0_18px_55px_rgba(15,23,42,0.35)] overflow-hidden ${isDark ? 'bg-[#0F172A] border-white/[0.12]' : 'bg-white border-slate-200'}`}
          style={{
            top: sortMenuPos.top !== undefined ? `${sortMenuPos.top}px` : undefined,
            bottom: sortMenuPos.bottom !== undefined ? `${sortMenuPos.bottom}px` : undefined,
            left: sortMenuPos.left !== undefined ? `${sortMenuPos.left}px` : undefined,
            right: sortMenuPos.right !== undefined ? `${sortMenuPos.right}px` : undefined,
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onMouseDown={handleSortSelect(option.value)}
                className={`w-full text-left px-3.5 py-2 text-[14px] transition-colors ${
                  isDark ? 'text-slate-300 hover:bg-white/[0.06]' : 'text-slate-700 hover:bg-slate-50'
                } ${
                  sortOption === option.value
                    ? (isDark ? 'bg-brand-500/20 text-brand-400 font-semibold' : 'bg-brand-50 text-brand-600 font-semibold')
                    : ''
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default FournisseursSearchBar;