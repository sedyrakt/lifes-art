// src/components/categories/CategoriesModalForm.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ DESIGN COMPACT PREMIUM — mifanaraka amin'ny CategoriesTable
// ⭐ FIX: FOND DARK = #0F172A ho an'ny modal, header, inputs
// ⭐ FONT SIZE: h2 18px, labels 14px, inputs 15px, buttons 15px
// ⭐ FIX: NESORINA ny étoile `*` amin'ny labels
// ⭐ FIX: NESORINA ny icon (Folder) ao amin'ny header

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const COLORS = {
  light: {
    card: '#FFFFFF',
    border: '#E2E8F0',
    headerBg: '#FFFFFF',
    formBg: '#FFFFFF',
    inputBg: '#FFFFFF',
    softBg: '#F8FAFC',
    text: '#0F172A',
    muted: '#64748B',
    subMuted: '#94A3B8',
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    primaryBg: 'rgba(79,70,229,0.07)',
    primaryBorder: 'rgba(79,70,229,0.20)',
  },
  dark: {
    card: '#0F172A',
    border: 'rgba(255,255,255,0.12)',
    headerBg: '#0F172A',
    formBg: '#0F172A',
    inputBg: '#0F172A',
    softBg: '#1E293B',
    text: '#F8FAFC',
    muted: '#94A3B8',
    subMuted: '#94A3B8',
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    primaryBg: 'rgba(79,70,229,0.12)',
    primaryBorder: 'rgba(79,70,229,0.28)',
  },
};

interface Categorie { id: number; nom: string; description: string; created_at: string; }

interface CategoriesModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  editingCategorie: Categorie | null;
  isDark?: boolean;
}

// ⭐ FormCell — NESORINA ny étoile `*`
const FormCell: React.FC<{ label: string; children: React.ReactNode; fullWidth?: boolean; }> = ({ label, children, fullWidth = false }) => {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  return (
    <div className={`min-w-0 ${fullWidth ? 'w-full' : ''}`}>
      <label className="mb-1.5 block text-[14px] font-medium" style={{ color: theme.muted }}>
        {label}
      </label>
      {children}
    </div>
  );
};

const CategoriesModalForm: React.FC<CategoriesModalFormProps> = ({ isOpen, onClose, onSubmit, editingCategorie, isDark: propIsDark }) => {
  const { isDark: themeIsDark } = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : themeIsDark;
  const theme = isDark ? COLORS.dark : COLORS.light;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); formRef.current?.requestSubmit(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  if (!isOpen) return null;

  const inputClass = `h-11 w-full rounded-lg border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] px-3.5 text-[15px] font-medium text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20`;

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-200 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="relative z-[100000] flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] shadow-[0_24px_70px_rgba(0,0,0,0.25)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand-500" />

        {/* HEADER — tsy misy icon intsony */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] px-5">
          <h2 id="category-modal-title" className="truncate text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {editingCategorie ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <form ref={formRef} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <FormCell label="Nom" fullWidth>
              <input
                type="text"
                name="nom"
                defaultValue={editingCategorie?.nom || ''}
                required
                autoFocus={!editingCategorie}
                autoComplete="off"
                placeholder="Ex : Électronique, Vêtements..."
                className={inputClass}
              />
            </FormCell>

            <div className="mt-4">
              <FormCell label="Description" fullWidth>
                <textarea
                  name="description"
                  defaultValue={editingCategorie?.description || ''}
                  rows={4}
                  placeholder="Description de la catégorie..."
                  className={`${inputClass} h-auto resize-none py-3 leading-6`}
                />
              </FormCell>
            </div>
          </div>

          <footer className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#1E293B] px-5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg px-4.5 text-[15px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md active:scale-[0.98]"
            >
              {editingCategorie ? <Check size={17} strokeWidth={2} /> : <Plus size={17} strokeWidth={2} />}
              {editingCategorie ? 'Modifier' : 'Ajouter'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default CategoriesModalForm;