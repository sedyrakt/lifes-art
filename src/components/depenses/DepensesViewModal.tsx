// src/components/depenses/DepensesViewModal.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur ProduitsViewModal / ClientsViewModal / FournisseursViewModal / CommandesDetailsModal
// ⭐ FONT SIZE: h2 18px, subtitle 14px, labels 13px, values 15px, buttons 15px
// ⭐ UPDATE: Nampiana border ny bouton X (header) sy Fermer (footer) ary nampitomboina ny fontSize an'ny X

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const COLORS = {
  light: {
    card: '#FFFFFF', border: '#CBD5E1', softBg: '#F8FAFC', text: '#0F172A',
    muted: '#64748B', primary: '#4F46E5', green: '#059669', red: '#DC2626', amber: '#D97706'
  },
  dark: {
    card: '#0F172A', border: 'rgba(255,255,255,0.12)', softBg: '#0F172A', text: '#F8FAFC',
    muted: '#94A3B8', primary: '#4F46E5', green: '#34D399', red: '#F87171', amber: '#FBBF24'
  }
};

interface Depense {
  id: number;
  categorie: string;
  description: string;
  montant: number;
  date_depense: string;
  mode_paiement: string;
  reference: string;
  fournisseur_id: number;
  fournisseur_nom?: string;
  observation: string;
  created_at: string;
}

interface DepensesViewModalProps {
  depense: Depense;
  onClose: () => void;
  onEdit: () => void;
  categoryIcons: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>;
  categoryColors: (cat: string) => { light: string; dark: string; text: string; };
}

const formatMoney = (value: any) => `${Number(value || 0).toLocaleString('fr-FR')} Ar`;

const formatDate = (date?: string) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR');
};

const DepensesViewModal: React.FC<DepensesViewModalProps> = ({ depense, onClose, onEdit, categoryIcons, categoryColors }) => {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
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

  if (!depense) return null;

  const safeDescription = depense?.description || 'Aucune description';
  const montant = Number(depense?.montant || 0);

  const category = categoryColors(depense?.categorie);
  const categoryBg = isDark ? category.dark : category.light;
  const categoryText = category.text;

  // ⭐ InfoRow : 13.5px → 15px, py-2.5 → py-3
  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-3 border-b" style={{ borderColor: theme.border }}>
      <span className="text-[15px]" style={{ color: theme.muted }}>{label}</span>
      <span className="text-[15px] font-semibold text-right" style={{ color: theme.text }}>{value}</span>
    </div>
  );

  const modal = (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: isDark ? 'rgba(0,0,0,0.80)' : 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="depense-view-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-xl border-[0.5px] shadow-[0_18px_55px_rgba(15,23,42,0.35)] transition-all duration-200 ${
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
        }`}
        style={{ background: theme.card, borderColor: theme.border }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand-500" />

        {/* HEADER */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b dark:border-b-[0.5px] px-5" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <h2 id="depense-view-title" className="truncate text-[18px] font-semibold leading-tight" style={{ color: theme.text }}>
                Détails de la dépense
              </h2>
              <p className="text-[14px] leading-[1.3] mt-0.5 font-mono" style={{ color: theme.muted }}>
                {depense?.reference ? `${depense.reference} · ` : ''}{formatDate(depense?.date_depense)}
              </p>
            </div>
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
          
          {/* CATEGORIE INFO */}
          <div className="mb-4">
            <div className="min-w-0">
              <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3]" style={{ color: theme.muted }}>Catégorie</p>
              <p className="text-[15px] font-semibold flex items-center gap-2 mt-1" style={{ color: theme.text }}>
                {depense?.categorie || 'Non spécifiée'}
              </p>
              {depense?.fournisseur_nom && (
                <p className="text-[13.5px] leading-[1.3] mt-1" style={{ color: theme.muted }}>
                  Fournisseur : {depense.fournisseur_nom}
                </p>
              )}
            </div>
          </div>

          {/* DETAILS */}
          <div className="mt-4 flex flex-col">
            <InfoRow label="Description" value={safeDescription} />
            <InfoRow label="Montant total" value={<span className="font-semibold" style={{ color: theme.primary }}>{formatMoney(montant)}</span>} />
            <InfoRow label="Mode de paiement" value={depense?.mode_paiement || '—'} />
            <InfoRow label="Date" value={formatDate(depense?.date_depense)} />
            <InfoRow label="Référence" value={depense?.reference || '—'} />
          </div>

          {/* OBSERVATION */}
          {depense?.observation && (
            <div className="mt-4 border-t dark:border-t-[0.5px] pt-4" style={{ borderColor: theme.border }}>
              <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3] mb-2" style={{ color: theme.muted }}>Observation</p>
              <div className="text-[15px] leading-[1.6]" style={{ color: theme.text }}>{depense.observation}</div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t dark:border-t-[0.5px] px-5" style={{ borderColor: theme.border, background: theme.softBg }}>
          
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
            className="flex h-10 items-center gap-2 rounded-lg px-5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:opacity-90 active:scale-[0.98]"
            style={{ background: theme.primary }}
          >
            <Edit size={17} strokeWidth={2.2} />
            Modifier
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default DepensesViewModal;