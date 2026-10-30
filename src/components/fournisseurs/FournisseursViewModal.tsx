// src/components/fournisseurs/FournisseursViewModal.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur ProduitsViewModal / CategoriesViewModal
// ⭐ FONT SIZE: h2 18px, labels 13px, values 15px, buttons 15px
// ⭐ FIX: NESORINA ny avatar (initials circle) sy ny badge "Actif"
// ⭐ UPDATE: Nampiana border ny bouton X (header) sy Fermer (footer) ary nampitomboina ny fontSize an'ny X

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit3 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Fournisseur {
  id: number;
  nom: string;
  contact: string;
  telephone: string;
  email: string;
  adresse: string;
  created_at: string;
}

interface FournisseursViewModalProps {
  fournisseur: Fournisseur;
  onClose: () => void;
  onEdit: () => void;
  isDark?: boolean;
}

const FournisseursViewModal: React.FC<FournisseursViewModalProps> = ({ fournisseur, onClose, onEdit }) => {
  const { isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!fournisseur) return null;

  const formatDate = (date?: string) => {
    if (!date) return '—';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 text-[15px] py-3">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="min-w-0 text-right font-semibold text-slate-900 dark:text-slate-100 truncate">{value}</span>
    </div>
  );

  const modal = (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } bg-black/80 dark:bg-black/80 backdrop-blur-sm`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fournisseur-view-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border-[0.5px] border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] shadow-[0_18px_55px_rgba(15,23,42,0.35)] transition-all duration-200 ${
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand-500" />

        {/* HEADER */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] px-5">
          <h2 id="fournisseur-view-title" className="truncate text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Détails du fournisseur
          </h2>
          
          {/* ⭐ FIX: Bouton Fermer (X) — nampiana border, nampitomboina ny fontSize (text-[31.5px]) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-400 dark:hover:bg-white/[0.06] active:scale-[0.98] pb-0.5"
          >
            <span className="text-[31.5px] font-light leading-none">×</span>
          </button>
        </header>

        {/* BODY */}
        <main className="px-5 py-4">
          {/* ⭐⭐⭐ Nom du fournisseur — tsy misy avatar ⭐⭐⭐ */}
          <div className="mb-4">
            <h3 className="truncate text-[18px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {fournisseur.nom}
            </h3>
          </div>

          {/* Détails */}
          <div className="mt-4 border-t border-slate-200 dark:border-white/[0.08] pt-4">
            <div className="flex flex-col">
              <div className="border-b border-slate-200 dark:border-white/[0.08]">
                <InfoRow label="Contact" value={fournisseur.contact || '—'} />
              </div>
              <div className="border-b border-slate-200 dark:border-white/[0.08]">
                <InfoRow label="Téléphone" value={fournisseur.telephone || '—'} />
              </div>
              <div className="border-b border-slate-200 dark:border-white/[0.08]">
                <InfoRow label="Email" value={fournisseur.email || '—'} />
              </div>
              <div className="border-b border-slate-200 dark:border-white/[0.08]">
                <InfoRow label="Adresse" value={fournisseur.adresse || '—'} />
              </div>
              <div>
                <InfoRow label="Créé le" value={formatDate(fournisseur.created_at)} />
              </div>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0F172A] px-5">
          
          {/* ⭐ FIX: Bouton Fermer (footer) — nampiana border mba hitovy amin'ny Modifier */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-lg border border-slate-200 px-5 text-[15px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-400 dark:hover:bg-white/[0.06] active:scale-[0.98]"
          >
            Fermer
          </button>
          
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 active:scale-[0.98]"
          >
            <Edit3 size={17} strokeWidth={2.2} />
            Modifier
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default FournisseursViewModal;