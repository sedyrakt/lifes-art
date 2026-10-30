// src/components/categories/CategoriesViewModal.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur ProduitsViewModal / ProfilePasswordModal
// ⭐ FONT SIZE: h2 18px, subtitle 14px, labels 13px, values 15px, buttons 15px
// ⭐ FIX: NESORINA ny badge "Actif" — tsy ilaina
// ⭐ FIX: NESORINA ny icon (Folder) ao amin'ny header
// ⭐ UPDATE: Nampiana border ny bouton X (header) sy Fermer (footer) ary nampitomboina ny fontSize an'ny X

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const COLORS = {
  light: {
    card: '#FFFFFF', border: '#E2E8F0', softBg: '#F8FAFC', text: '#0F172A', muted: '#64748B',
    primary: '#4F46E5', green: '#059669', red: '#DC2626', amber: '#D97706'
  },
  dark: {
    card: '#0F172A', border: 'rgba(255,255,255,0.12)', softBg: '#0F172A', text: '#F8FAFC',
    muted: '#94A3B8', primary: '#4F46E5', green: '#34D399', red: '#F87171', amber: '#FBBF24'
  }
};

interface Categorie {
  id: number;
  nom: string;
  description: string;
  created_at: string;
}

interface CategoriesViewModalProps {
  categorie: Categorie;
  onClose: () => void;
  onEdit: () => void;
  getCategoryColor: (id: number) => string;
  isDark?: boolean;
}

const formatDate = (date?: string) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR');
};

const CategoriesViewModal: React.FC<CategoriesViewModalProps> = ({
  categorie,
  onClose,
  onEdit,
  getCategoryColor,
  isDark: propIsDark,
}) => {
  const { isDark: contextIsDark } = useTheme();
  const isDark = propIsDark ?? contextIsDark;
  const theme = isDark ? COLORS.dark : COLORS.light;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!categorie) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: isDark ? 'rgba(0,0,0,0.80)' : 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl border-[0.5px] shadow-[0_18px_55px_rgba(15,23,42,0.35)]"
        style={{ background: theme.card, borderColor: theme.border }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER — tsy misy icon intsony */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold leading-tight" style={{ color: theme.text }}>
              Détails de la catégorie
            </h2>
           
          </div>
          
          {/* ⭐ FIX: Bouton Fermer (X) — nampiana border, nampitomboina ny fontSize (text-[31.5px]) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border dark:border-[0.5px] text-[31.5px] font-light leading-none transition-colors hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98] pb-0.5"
            style={{ color: theme.muted, borderColor: theme.border }}
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <div className="min-w-0">
              <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3]" style={{ color: theme.muted }}>
                Catégorie
              </p>
              <p className="text-[15px] font-semibold leading-tight mt-1" style={{ color: theme.text }}>
                {categorie.nom}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col">
            <div className="flex justify-between text-[15px] py-3 border-b" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>ID</span>
              <span className="font-semibold" style={{ color: theme.text }}>{categorie.id}</span>
            </div>
            <div className="flex justify-between text-[15px] py-3 border-b" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Créée le</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatDate(categorie.created_at)}</span>
            </div>

            <div className="mt-4 border-t pt-4" style={{ borderColor: theme.border }}>
              <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3] mb-2" style={{ color: theme.muted }}>
                Description
              </p>
              <div className="text-[15px] leading-[1.6]" style={{ color: theme.text }}>
                {categorie.description || 'Aucune description'}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: theme.border, background: theme.softBg }}>
          
          {/* ⭐ FIX: Bouton Fermer (footer) — nampiana border mba hitovy amin'ny Modifier */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-lg border dark:border-[0.5px] px-5 text-[15px] font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]"
            style={{ color: theme.muted, borderColor: theme.border }}
          >
            Fermer
          </button>
          
          <button
            type="button"
            onClick={onEdit}
            className="h-10 flex items-center gap-2 rounded-lg px-5 text-[15px] font-semibold text-white transition-colors active:scale-[0.98]"
            style={{ background: theme.primary }}
          >
            <Edit size={17} strokeWidth={2.2} />
            Modifier
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CategoriesViewModal;