// src/components/produits/ProduitsViewModal.tsx
// ⭐ ESORINA ny Statut badge
// ⭐ VAOVAO: Aseho ny "Type de produit"
// ⭐ FIX LOGIQUE ERP STANDARD:
//    - Prix d'achat → aseho ho TYPE REHETRA
//    - Prix de vente → 'fini' IHANY
//    - Stock + Stock minimum → aseho ho TYPE REHETRA
//    - Bouton "Commande" → 'fini' IHANY
// ⭐ FIX: NESORINA ny icon (FileText) ao amin'ny header
// ⭐ UPDATE: Nampiana border ny bouton X (header) sy Fermer (footer) ary nampitomboina ny fontSize an'ny X

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit, ShoppingBag } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const COLORS = {
  light: { card: '#FFFFFF', border: '#CBD5E1', softBg: '#F8FAFC', text: '#0F172A', muted: '#64748B', primary: '#4F46E5', green: '#059669', red: '#DC2626', amber: '#D97706' },
  dark: { card: '#0F172A', border: 'rgba(255,255,255,0.12)', softBg: '#0F172A', text: '#F8FAFC', muted: '#94A3B8', primary: '#4F46E5', green: '#34D399', red: '#F87171', amber: '#FBBF24' }
};

interface Produit {
  id: number;
  code: string;
  nom: string;
  description?: string;
  categorie_nom?: string;
  fournisseur_nom?: string;
  prix_achat: number;
  prix_vente: number;
  quantite_stock: number;
  quantite_minimale: number;
  unite: string;
  type_produit?: string;
  nb_commandes?: number;
  tva_rate?: number | null;
  created_at?: string;
}

interface ProduitsViewModalProps {
  produit: Produit;
  onClose: () => void;
  onEdit: () => void;
  onNewCommande: () => void;
  isDark?: boolean;
}

const formatTva = (rate?: number | null) => {
  if (rate === undefined || rate === null || rate === '') return '0%';
  const val = Number(rate);
  if (!Number.isFinite(val)) return '0%';
  return `${(val * 100).toFixed(0)}%`;
};

const formatDateFr = (dateStr?: string) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const TYPE_LABELS: Record<string, string> = {
  fini: 'Produit fini',
  matiere_premiere: 'Matière première',
  fourniture: 'Fourniture',
};

const isTypeFini = (type?: string | null): boolean => {
  const key = String(type || 'fini').toLowerCase().trim();
  return key === 'fini' || key === '';
};

const ProduitsViewModal: React.FC<ProduitsViewModalProps> = ({ produit, onClose, onEdit, onNewCommande, isDark: propIsDark }) => {
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

  if (!produit) return null;

  const isFini = isTypeFini(produit.type_produit);

  const stock = Number(produit.quantite_stock || 0);
  const stockMin = Number(produit.quantite_minimale || 0);
  const isRupture = stock <= 0;
  const isAlert = !isRupture && stock <= stockMin;

  const stockColor = isRupture ? theme.red : isAlert ? theme.amber : theme.green;
  const stockLabel = isRupture ? 'Rupture de stock' : isAlert ? 'Stock faible' : 'Stock suffisant';

  const typeLabel = produit.type_produit ? TYPE_LABELS[produit.type_produit] || produit.type_produit : '—';

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
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold leading-tight" style={{ color: theme.text }}>Détails du produit</h2>
            <p className="text-[14px] leading-[1.3] mt-0.5" style={{ color: theme.muted }}>{produit.code || `#${produit.id}`}</p>
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3]" style={{ color: theme.muted }}>Produit</p>
                <p className="text-[15px] font-semibold leading-tight mt-1" style={{ color: theme.text }}>{produit.nom}</p>
                {produit.fournisseur_nom && (
                  <p className="text-[13.5px] leading-[1.3] mt-1" style={{ color: theme.muted }}>{produit.fournisseur_nom}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col">
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Code</span>
              <span className="font-semibold font-mono" style={{ color: theme.text }}>{produit.code || '—'}</span>
            </div>

            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Type de produit</span>
              <span className="font-semibold" style={{ color: theme.primary }}>{typeLabel}</span>
            </div>

            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Créé le</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatDateFr(produit.created_at)}</span>
            </div>

            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Catégorie</span>
              <span className="font-semibold" style={{ color: theme.text }}>{produit.categorie_nom || '—'}</span>
            </div>

            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Fournisseur</span>
              <span className="font-semibold" style={{ color: theme.text }}>{produit.fournisseur_nom || '—'}</span>
            </div>

            {/* ⭐ Prix d'achat — aseho ho TYPE REHETRA (ERP standard) */}
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Prix d'achat</span>
              <span className="font-semibold" style={{ color: theme.text }}>{Number(produit.prix_achat || 0).toLocaleString('fr-FR')} Ar</span>
            </div>

            {/* ⭐ Prix de vente — 'fini' IHANY */}
            {isFini && (
              <div className="flex justify-between text-[15px] font-semibold py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
                <span style={{ color: theme.text }}>Prix de vente</span>
                <span style={{ color: theme.primary }}>{Number(produit.prix_vente || 0).toLocaleString('fr-FR')} Ar</span>
              </div>
            )}

            {/* ⭐ Stock — aseho ho TYPE REHETRA (ERP standard) */}
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Stock</span>
              <span className="font-semibold" style={{ color: stockColor }}>
                {stock} {produit.unite || 'p.'} <span className="font-normal">({stockLabel})</span>
              </span>
            </div>

            {/* ⭐ Stock minimum — aseho ho TYPE REHETRA */}
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Stock minimum</span>
              <span className="font-semibold" style={{ color: theme.text }}>{stockMin} {produit.unite || 'p.'}</span>
            </div>

            <div className="flex justify-between text-[15px] py-3">
              <span style={{ color: theme.muted }}>Taux de TVA</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatTva(produit.tva_rate)}</span>
            </div>
          </div>

          {produit.description && (
            <div className="mt-4 border-t dark:border-t-[0.5px] pt-4" style={{ borderColor: theme.border }}>
              <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3] mb-2" style={{ color: theme.muted }}>Description</p>
              <div className="text-[15px] leading-[1.6]" style={{ color: theme.text }}>{produit.description}</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t dark:border-t-[0.5px]" style={{ borderColor: theme.border, background: theme.softBg }}>
          
          {/* ⭐ FIX: Bouton Fermer (footer) — nampiana border mba hitovy amin'ny Modifier */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 items-center justify-center rounded-lg border dark:border-[0.5px] px-5 text-[15px] font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]"
            style={{ color: theme.muted, borderColor: theme.border }}
          >
            Fermer
          </button>

          {/* ⭐ Bouton Commande — 'fini' IHANY */}
          {isFini && (
            <button 
              type="button"
              onClick={onNewCommande} 
              className="h-10 flex items-center gap-2 rounded-lg px-4.5 text-[15px] font-semibold border dark:border-[0.5px] transition-colors hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]" 
              style={{ color: theme.text, borderColor: theme.border }}
            >
              <ShoppingBag size={17} strokeWidth={2.2} />
              Commande
            </button>
          )}

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

export default ProduitsViewModal;