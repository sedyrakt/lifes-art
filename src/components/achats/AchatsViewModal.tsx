// src/components/achats/AchatsViewModal.tsx
// ⭐ FONT SIZE: h2 18px, subtitle 14px, labels 13px, values 15px, buttons 15px
// ⭐ VAOVAO: Colonne "Unité" ao amin'ny table produits
// ⭐ FIX: Whitespace text node ao anatin'ny <tr> — nafohezina tamin'ny andalana iray
// ⭐ FIX: NESORINA ny icon (FileText) ao amin'ny header
// ⭐ UPDATE: Nampiana border ny bouton X (header) sy Fermer (footer) ary nampitomboina ny fontSize an'ny X

import React, { useMemo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Pencil } from 'lucide-react';
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

interface Detail {
  id: number;
  produit_nom?: string;
  produit_code?: string;
  quantite: number;
  prix_unitaire: number;
  total: number;
  tva_rate?: number;
  unite?: string;
}

interface AchatDetails {
  id: number;
  reference?: string;
  date_achat?: string;
  fournisseur_nom?: string;
  total_ht?: number;
  total_ttc?: number;
  montant_paye?: number;
  montant_restant?: number;
  statut_paiement?: string;
  details?: Detail[];
}

interface AchatsViewModalProps {
  achat: AchatDetails | null;
  loadingDetails?: boolean;
  onClose: () => void;
  onEdit?: (achat: any) => void;
  onGeneratePDF?: (achat: any) => void;
}

const formatMoney = (value: any) => `${Number(value || 0).toLocaleString('fr-FR')} Ar`;
const formatDate = (date?: string) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR');
};

const formatTva = (rate: number | undefined | null) => {
  if (rate === undefined || rate === null) return '0%';
  if (rate > 1) return `${rate}%`;
  return `${Math.round(rate * 100)}%`;
};

const AchatsViewModal: React.FC<AchatsViewModalProps> = ({
  achat,
  loadingDetails,
  onClose,
  onEdit,
  onGeneratePDF,
}) => {
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

  const safeDetails = useMemo(() => (Array.isArray(achat?.details) ? achat.details : []), [achat]);

  const totalHT = useMemo(() => {
    return safeDetails.reduce((total, d) => total + (Number(d.quantite || 0) * Number(d.prix_unitaire || 0)), 0);
  }, [safeDetails]);

  const totalTVA = useMemo(() => {
    return safeDetails.reduce((total, d) => {
      const rate = (d.tva_rate !== undefined && d.tva_rate !== null && d.tva_rate !== '') ? Number(d.tva_rate) : 0;
      const safeRate = Number.isFinite(rate) ? rate : 0;
      const lineTotal = (Number(d.quantite || 0) * Number(d.prix_unitaire || 0));
      return total + lineTotal * safeRate;
    }, 0);
  }, [safeDetails]);

  const totalTTC = totalHT + totalTVA;

  const montantPaye = Number(achat?.montant_paye || 0);
  const montantRestant = Math.max(0, totalTTC - montantPaye);

  const statutPaiement = useMemo(() => {
    return achat?.statut_paiement || (montantPaye <= 0 ? 'Non payé' : montantPaye >= totalTTC ? 'Payé' : 'Partiel');
  }, [achat, montantPaye, totalTTC]);

  const statutStyle =
    statutPaiement === 'Payé'
      ? { background: 'rgba(16, 185, 129, 0.12)', color: theme.green, borderColor: 'rgba(16, 185, 129, 0.3)' }
      : statutPaiement === 'Partiel'
        ? { background: 'rgba(245, 158, 11, 0.12)', color: theme.amber, borderColor: 'rgba(245, 158, 11, 0.3)' }
        : { background: 'rgba(239, 68, 68, 0.12)', color: theme.red, borderColor: 'rgba(239, 68, 68, 0.3)' };

  if (!achat) return null;

  const modal = (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 transition-all duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: isDark ? 'rgba(0,0,0,0.80)' : 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
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

        {/* HEADER — tsy misy icon intsony */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b dark:border-b-[0.5px] px-5" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-semibold leading-tight" style={{ color: theme.text }}>
              Détails de l'achat
            </h2>
            <p className="text-[14px] leading-[1.3] mt-0.5 font-mono" style={{ color: theme.muted }}>
              {achat.reference || `#${achat.id}`} · {formatDate(achat.date_achat)}
            </p>
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

          {/* Fournisseur & Statut */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3]" style={{ color: theme.muted }}>Fournisseur</p>
                <p className="text-[15px] font-semibold leading-tight mt-1" style={{ color: theme.text }}>{achat.fournisseur_nom || 'Fournisseur inconnu'}</p>
              </div>
              <span
                className="inline-flex shrink-0 items-center rounded-md border px-2.5 py-1.5 text-[13px] font-semibold leading-tight"
                style={{ background: statutStyle.background, color: statutStyle.color, borderColor: statutStyle.borderColor }}
              >
                {statutPaiement}
              </span>
            </div>
          </div>

          {/* Tableau des produits */}
          <div className="overflow-hidden rounded-lg border dark:border-[0.5px]" style={{ borderColor: theme.border }}>
            <table className="w-full text-left">
              <thead style={{ background: theme.softBg }}>
                <tr className="text-[12.5px] uppercase tracking-[0.06em] font-semibold" style={{ color: theme.muted }}>
                  <th className="px-3 py-2.5">Produit</th><th className="px-3 py-2.5 text-center">Qté</th><th className="px-3 py-2.5 text-center">Unité</th><th className="px-3 py-2.5 text-right">Prix</th><th className="px-3 py-2.5 text-right">TVA</th><th className="px-3 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {safeDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-[14.5px]" style={{ color: theme.muted }}>Aucun produit</td>
                  </tr>
                ) : (
                  safeDetails.map((detail: any) => (
                    <tr key={detail.id} className="border-t dark:border-t-[0.5px]" style={{ borderColor: theme.border }}>
                      <td className="px-3 py-3">
                        <p className="text-[15px] font-semibold leading-tight" style={{ color: theme.text }}>
                          {detail.produit_nom || '—'}
                        </p>
                      </td><td className="px-3 py-3 text-center text-[15px]" style={{ color: theme.muted }}>{detail.quantite}</td><td className="px-3 py-3 text-center text-[15px]" style={{ color: theme.muted }}>{detail.unite || 'pièce'}</td><td className="px-3 py-3 text-right text-[15px]" style={{ color: theme.muted }}>{formatMoney(detail.prix_unitaire)}</td><td className="px-3 py-3 text-right text-[15px]" style={{ color: theme.muted }}>{formatTva(detail.tva_rate)}</td><td className="px-3 py-3 text-right text-[15px] font-semibold" style={{ color: theme.text }}>{formatMoney(detail.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Récapitulatif */}
          <div className="mt-4 flex flex-col">
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Total HT</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatMoney(totalHT)}</span>
            </div>
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>TVA</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatMoney(totalTVA)}</span>
            </div>
            <div className="flex justify-between text-[15px] font-semibold py-3.5 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.text }}>Total TTC</span>
              <span style={{ color: theme.primary }}>{formatMoney(totalTTC)}</span>
            </div>
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Montant payé</span>
              <span className="font-semibold" style={{ color: theme.green }}>{formatMoney(montantPaye)}</span>
            </div>
            <div className="flex justify-between text-[15px] py-3">
              <span style={{ color: theme.muted }}>Reste à payer</span>
              <span className="font-semibold" style={{ color: theme.red }}>{formatMoney(montantRestant)}</span>
            </div>
          </div>
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
          
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(achat)}
              className="flex h-10 items-center gap-2 rounded-lg px-5 text-[15px] font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
              style={{ background: theme.green }}
            >
              <Pencil size={17} strokeWidth={2.2} />
              Modifier
            </button>
          )}
          {onGeneratePDF && (
            <button
              type="button"
              onClick={() => onGeneratePDF(achat)}
              className="flex h-10 items-center gap-2 rounded-lg px-5 text-[15px] font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
              style={{ background: theme.primary }}
            >
              <Printer size={17} strokeWidth={2.2} />
              Imprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default AchatsViewModal;