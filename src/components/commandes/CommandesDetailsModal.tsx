// src/components/commandes/CommandesDetailsModal.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FIX: Manao kajy ny frais de livraison raha tsy voaray avy amin'ny backend
// ⭐ TSY MISY ICON — nalana daholo
// ⭐ FIX: "TOTAL" → "TOTAL HT" amin'ny header column
// ⭐ FIX: NESORINA ny ora amin'ny "Date de commande"
// ⭐ NOUVEAU: Bouton "Modifier" — nampiana ao amin'ny footer
// ⭐ UPDATE: Natao hita kokoa ny border gris rehefa Light Mode (#CBD5E1) sy dark:border-[0.5px]
// ⭐ NOUVEAU: Nampiana "Échéance de paiement" sy ny calcul de retard
// ⭐ FIX: Nesorina ny ora amin'ny échéance
// ⭐ UPDATE: Nampitomboina ny X (Fermer) header, nampiana border ny "Fermer" footer
// ⭐ FIX: Nahena 0.5px ny fontSize an'ilay X (text-[31.5px])

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const COLORS = {
  light: { card: '#FFFFFF', border: '#CBD5E1', softBg: '#F8FAFC', text: '#0F172A', muted: '#64748B', primary: '#4F46E5', green: '#059669', red: '#DC2626', amber: '#D97706' },
  dark: { card: '#0F172A', border: 'rgba(255,255,255,0.12)', softBg: '#0F172A', text: '#F8FAFC', muted: '#94A3B8', primary: '#4F46E5', green: '#34D399', red: '#F87171', amber: '#FBBF24' },
};

interface Commande {
  id: number;
  numero: string;
  client_nom: string;
  client_telephone: string;
  client_email: string;
  date_commande: string;
  total_ht: number;
  total_ttc: number;
  remise: number;
  observation: string;
  statut_paiement: string;
  montant_paye: number;
  montant_restant: number;
  mode_paiement?: string;
  modalite_paiement?: string;
  frais_livraison?: number;
  livraison?: string;
  date_limite_paiement?: string;
}

interface DetailCommande {
  id: number;
  produit_id: number;
  produit_nom: string;
  produit_code: string;
  quantite: number;
  prix_unitaire: number;
  total_ligne: number;
  tva_rate?: number;
}

interface CommandesDetailsModalProps {
  commande: Commande;
  details?: DetailCommande[];
  onClose: () => void;
  onGenerateFacture: () => void;
  onUpdatePaiement?: (id: number, data: { montant_paye: number; statut_paiement: string }) => void;
  onEdit?: (commande: Commande) => void;
  clientImageUrl?: string | null;
  clientImageError?: boolean;
}

// ⭐ Helper: Formatage des montants
const formatMoney = (value: any) => `${Number(value || 0).toLocaleString('fr-FR')} Ar`;

// ⭐ Helper: Formatage TVA
const formatTva = (rate: number | undefined | null) => {
  if (rate === undefined || rate === null) return '0%';
  if (rate > 1) return `${rate}%`;
  return `${Math.round(rate * 100)}%`;
};

// ⭐ Helper: Formatage date
const formatDate = (date?: string) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ⭐ Helper: Calcul de l'échéance
const parseDeadline = (deadline?: string | null): Date | null => {
  if (!deadline) return null;
  const value = String(deadline).trim();
  if (!value) return null;
  const dateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (dateTimeMatch) {
    const [, y, m, d, hh, mm, ss = '0'] = dateTimeMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  }
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLiveDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} sec`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours} h`;
  return `${Math.floor(totalHours / 24)} j`;
};

const getDeadlineInfo = (dateLimite?: string | null) => {
  const deadline = parseDeadline(dateLimite);
  if (!deadline) return { overdue: false, detail: '', date: null };
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return {
      overdue: true,
      detail: `${formatLiveDuration(Math.abs(diffMs))} de retard`,
      date: deadline,
    };
  }
  
  return {
    overdue: false,
    detail: `Dans ${formatLiveDuration(diffMs)}`,
    date: deadline,
  };
};

// ⭐ Daty ihany no aseho (nesorina ny ora)
const formatDeadlineDate = (d: Date | null) => {
  if (!d) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  });
};

const CommandesDetailsModal: React.FC<CommandesDetailsModalProps> = ({
  commande,
  details = [],
  onClose,
  onGenerateFacture,
  onUpdatePaiement,
  onEdit,
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  const safeDetails = useMemo(() => (Array.isArray(details) ? details : []), [details]);

  const rawTotalHT = useMemo(
    () => safeDetails.reduce((total, d) => total + Number(d.quantite || 0) * Number(d.prix_unitaire || 0), 0),
    [safeDetails]
  );

  const remise = Number(commande.remise) || 0;
  const baseHT = Math.max(rawTotalHT - remise, 0);

  const calculatedTVA = useMemo(() => {
    if (baseHT <= 0) return 0;
    const ratio = rawTotalHT > 0 ? baseHT / rawTotalHT : 0;
    return safeDetails.reduce((total, d) => {
      const rate = (d.tva_rate !== undefined && d.tva_rate !== null && d.tva_rate !== '') ? Number(d.tva_rate) : 0;
      const safeRate = Number.isFinite(rate) ? rate : 0;
      const lineHT = (Number(d.quantite || 0) * Number(d.prix_unitaire || 0)) * ratio;
      return total + lineHT * safeRate;
    }, 0);
  }, [safeDetails, baseHT, rawTotalHT]);

  const dbTotalTTC = Number(commande.total_ttc || 0);
  let fraisLivraison = Number(commande.frais_livraison || 0);

  if (fraisLivraison === 0 && dbTotalTTC > 0) {
    const baseHTAndTVA = baseHT + calculatedTVA;
    if (dbTotalTTC > baseHTAndTVA) {
      fraisLivraison = dbTotalTTC - baseHTAndTVA;
    }
  }

  const calculatedTotalTTC = dbTotalTTC > 0 ? dbTotalTTC : (baseHT + calculatedTVA + fraisLivraison);

  const montantPaye = Number(commande.montant_paye) || 0;
  const montantRestant = Math.max(0, calculatedTotalTTC - montantPaye);

  const statutPaiement = useMemo(() => {
    if (montantPaye <= 0) return 'Non payé';
    if (montantPaye >= calculatedTotalTTC) return 'Payé';
    return 'Partiel';
  }, [montantPaye, calculatedTotalTTC]);

  const statutStyle = statutPaiement === 'Payé'
    ? { background: 'rgba(16, 185, 129, 0.12)', color: theme.green, borderColor: 'rgba(16, 185, 129, 0.3)' }
    : statutPaiement === 'Partiel'
      ? { background: 'rgba(245, 158, 11, 0.12)', color: theme.amber, borderColor: 'rgba(245, 158, 11, 0.3)' }
      : { background: 'rgba(239, 68, 68, 0.12)', color: theme.red, borderColor: 'rgba(239, 68, 68, 0.3)' };

  const isPaye = statutPaiement === 'Payé';

  const livraisonDisplay = commande.livraison === 'Oui' || commande.livraison === 'Non'
    ? commande.livraison
    : (fraisLivraison > 0 ? 'Oui' : 'Non');

  // ⭐ Calcul ny échéance
  const deadlineInfo = useMemo(() => {
    if (isPaye || montantRestant <= 0) {
      const d = parseDeadline(commande.date_limite_paiement);
      return { overdue: false, detail: '', date: d };
    }
    return getDeadlineInfo(commande.date_limite_paiement);
  }, [isPaye, montantRestant, commande.date_limite_paiement]);

  if (!commande) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: isDark ? 'rgba(0,0,0,0.80)' : 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-xl border dark:border-[0.5px] shadow-[0_18px_55px_rgba(15,23,42,0.35)]"
        style={{ background: theme.card, borderColor: theme.border }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b dark:border-b-[0.5px] px-5" style={{ borderColor: theme.border, background: theme.card }}>
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold leading-tight" style={{ color: theme.text }}>
                Détails de la commande
              </h2>
              <p className="text-[14px] leading-[1.3] mt-0.5 font-mono" style={{ color: theme.muted }}>
                {commande.numero}
              </p>
            </div>
          </div>
          
          {/* ⭐ FIX: Bouton Fermer (X) — text-[31.5px] */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-lg border dark:border-[0.5px] text-[31.5px] font-light leading-none transition-colors hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98] pb-0.5"
            style={{ color: theme.muted, borderColor: theme.border }}
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* CLIENT + STATUT */}
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3]" style={{ color: theme.muted }}>Client</p>
                <p className="text-[15px] font-semibold leading-tight mt-1" style={{ color: theme.text }}>
                  {commande.client_nom || 'Client inconnu'}
                </p>
                {commande.client_telephone && (
                  <p className="text-[13.5px] leading-[1.3] mt-1" style={{ color: theme.muted }}>
                    {commande.client_telephone}
                  </p>
                )}
              </div>
              <span
                className="inline-flex shrink-0 items-center rounded-md border px-2.5 py-1.5 text-[13px] font-semibold leading-tight"
                style={{ background: statutStyle.background, color: statutStyle.color, borderColor: statutStyle.borderColor }}
              >
                {statutPaiement}
              </span>
            </div>
          </div>

          {/* INFO ROWS */}
          <div className="mb-4">
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Date de commande</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatDate(commande.date_commande)}</span>
            </div>

            {/* ⭐ Échéance de paiement */}
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Échéance de paiement</span>
              <div className="flex flex-col items-end gap-0.5 text-right">
                {commande.date_limite_paiement ? (
                  <>
                    <span 
                      className="font-semibold" 
                      style={{ color: deadlineInfo.overdue ? theme.red : theme.text }}
                    >
                      {formatDeadlineDate(deadlineInfo.date)}
                    </span>
                    {isPaye ? (
                      <span className="text-[13px] font-semibold" style={{ color: theme.green }}>Payé</span>
                    ) : deadlineInfo.overdue ? (
                      <span className="text-[13px] font-semibold" style={{ color: theme.red }}>
                        {deadlineInfo.detail}
                      </span>
                    ) : (
                      <span className="text-[13px] font-semibold" style={{ color: theme.amber }}>
                        {deadlineInfo.detail}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="font-semibold" style={{ color: theme.muted }}>—</span>
                )}
              </div>
            </div>

            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Modalité de paiement</span>
              <span className="font-semibold" style={{ color: theme.text }}>
                {commande.modalite_paiement || 'Immediat'}
                {commande.mode_paiement && (
                  <span className="ml-1 text-[13px] font-normal" style={{ color: theme.muted }}>
                    · {commande.mode_paiement}
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Livraison</span>
              <span className="flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded-md border px-2.5 py-1 text-[13px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: livraisonDisplay === 'Oui' ? 'rgba(16,185,129,0.35)' : 'rgba(100,116,139,0.35)',
                    background: livraisonDisplay === 'Oui' ? 'rgba(16,185,129,0.10)' : 'rgba(100,116,139,0.08)',
                    color: livraisonDisplay === 'Oui' ? theme.green : theme.muted,
                  }}
                >
                  {livraisonDisplay}
                </span>
                {fraisLivraison > 0 && (
                  <span className="text-[15px] font-semibold" style={{ color: theme.text }}>
                    {formatMoney(fraisLivraison)}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* DETAILS PRODUITS */}
          <div className="overflow-hidden rounded-lg border dark:border-[0.5px]" style={{ borderColor: theme.border }}>
            <table className="w-full text-left">
              <thead style={{ background: theme.softBg }}>
                <tr className="text-[12.5px] uppercase tracking-wide font-semibold" style={{ color: theme.muted }}>
                  <th className="px-3 py-2.5">Produit</th>
                  <th className="px-3 py-2.5 text-center">Qté</th>
                  <th className="px-3 py-2.5 text-right">Prix</th>
                  <th className="px-3 py-2.5 text-right">TVA</th>
                  <th className="px-3 py-2.5 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {safeDetails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-[14.5px]" style={{ color: theme.muted }}>
                      Aucun produit
                    </td>
                  </tr>
                ) : (
                  safeDetails.map((detail: any) => (
                    <tr key={detail.id} className="border-t dark:border-t-[0.5px]" style={{ borderColor: theme.border }}>
                      <td className="px-3 py-3">
                        <p className="text-[15px] font-semibold leading-tight" style={{ color: theme.text }}>
                          {detail.produit_nom || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center text-[15px]" style={{ color: theme.muted }}>{detail.quantite}</td>
                      <td className="px-3 py-3 text-right text-[15px]" style={{ color: theme.muted }}>{formatMoney(detail.prix_unitaire)}</td>
                      <td className="px-3 py-3 text-right text-[15px]" style={{ color: theme.muted }}>{formatTva(detail.tva_rate)}</td>
                      <td className="px-3 py-3 text-right text-[15px] font-semibold" style={{ color: theme.text }}>
                        {formatMoney(detail.quantite * detail.prix_unitaire)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* TOTAUX */}
          <div className="mt-4 flex flex-col">
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>Total HT</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatMoney(baseHT)}</span>
            </div>
            <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.muted }}>TVA</span>
              <span className="font-semibold" style={{ color: theme.text }}>{formatMoney(calculatedTVA)}</span>
            </div>
            {fraisLivraison > 0 && (
              <div className="flex justify-between text-[15px] py-3 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
                <span style={{ color: theme.muted }}>Frais de livraison</span>
                <span className="font-semibold" style={{ color: theme.text }}>{formatMoney(fraisLivraison)}</span>
              </div>
            )}
            <div className="flex justify-between text-[15px] font-semibold py-3.5 border-b dark:border-b-[0.5px]" style={{ borderColor: theme.border }}>
              <span style={{ color: theme.text }}>Total TTC</span>
              <span style={{ color: theme.primary }}>{formatMoney(calculatedTotalTTC)}</span>
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

          {/* OBSERVATION */}
          {commande.observation?.trim() && (
            <div className="mt-4 border-t dark:border-t-[0.5px] pt-4" style={{ borderColor: theme.border }}>
              <p className="text-[13px] uppercase font-semibold tracking-[0.06em] leading-[1.3] mb-2" style={{ color: theme.muted }}>
                Observation
              </p>
              <div className="text-[15px] leading-[1.6]" style={{ color: theme.text }}>
                {commande.observation}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t dark:border-t-[0.5px] px-5"
          style={{ borderColor: theme.border, background: theme.softBg }}
        >
          {/* ⭐ FIX: Bouton Fermer (footer) — nampiana border */}
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
              onClick={() => { onClose(); onEdit(commande); }}
              className="flex h-10 items-center gap-2 rounded-lg border dark:border-[0.5px] px-5 text-[15px] font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]"
              style={{ color: theme.text, borderColor: theme.border }}
            >
              <Pencil size={16} strokeWidth={2.2} />
              Modifier
            </button>
          )}

          {!isPaye && onUpdatePaiement && (
            <button
              type="button"
              onClick={() => onUpdatePaiement(commande.id, { montant_paye: calculatedTotalTTC, statut_paiement: 'Payé' })}
              className="flex h-10 items-center gap-2 rounded-lg px-5 text-[15px] font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
              style={{ background: theme.green }}
            >
              Payée
            </button>
          )}

          <button
            type="button"
            onClick={() => { onClose(); onGenerateFacture(); }}
            className="flex h-10 items-center gap-2 rounded-lg px-5 text-[15px] font-semibold text-white transition-colors hover:opacity-90 active:scale-[0.98]"
            style={{ background: theme.primary }}
          >
            Imprimer
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default CommandesDetailsModal;