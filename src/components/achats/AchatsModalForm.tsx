// src/components/achats/AchatsModalForm.tsx
// ⭐ FONT SIZE: h2 18px, labels 14px, inputs 15px, buttons 15px
// ⭐ TSY MISY ICON — nalana daholo
// ⭐ NOUVEAU: Filtre produits par fournisseur + réinitialisation panier au changement
// ⭐ FIX: Number inputs tsy mampiseho "0" voalohany (015 → 15, 0800 → 800)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../contexts/ThemeContext';
import AchatsProductSelector from './AchatsProductSelector';

const COLORS = {
  light: { card: '#FFFFFF', border: '#E2E8F0', headerBg: '#FFFFFF', inputBg: '#FFFFFF', softBg: '#F8FAFC', sectionBg: '#FFFFFF', text: '#0F172A', muted: '#64748B', subMuted: '#94A3B8', primary: '#4F46E5', primaryHover: '#4338CA', primaryBg: 'rgba(79,70,229,0.08)', green: '#059669', red: '#DC2626', amber: '#D97706' },
  dark: { card: '#0F172A', border: 'rgba(255,255,255,0.12)', headerBg: '#0F172A', inputBg: '#0F172A', softBg: '#0F172A', sectionBg: '#0F172A', text: '#F8FAFC', muted: '#94A3B8', subMuted: '#94A3B8', primary: '#4F46E5', primaryHover: '#4338CA', primaryBg: 'rgba(79,70,229,0.12)', green: '#34D399', red: '#F87171', amber: '#FBBF24' }
};

interface Fournisseur { id: number; nom: string; email: string; telephone: string; adresse: string; }
interface Produit {
  id: number; nom: string; code: string;
  prix_achat: number; quantite_stock: number;
  unite?: string; image?: string; tva_rate?: number;
  fournisseur_id?: number | null;
}
interface SelectedProduct { id: number; quantite: number; tva_rate?: number; }

interface AchatsModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  fournisseurs: Fournisseur[];
  produits: Produit[];
  selectedFournisseurId: number | null;
  onFournisseurChange: (id: number | null) => void;
  selectedProduits?: SelectedProduct[];
  onAddProduit?: (id: number, quantite: number, tva_rate?: number) => void;
  onUpdateQuantite?: (id: number, quantite: number) => void;
  onRemoveProduit?: (id: number) => void;
  onClearPanier?: () => void;
  editingAchat?: any;
  montantPaye?: number;
  onMontantPayeChange?: (value: number) => void;
  isDark?: boolean;
  tvaOverride?: number | null;
  onTvaRateChange?: (value: number | null) => void;
  fraisLivraison?: number;
  onFraisLivraisonChange?: (value: number) => void;
  modePaiement?: string;
  onModePaiementChange?: (value: string) => void;
  modaliteValue?: number;
  onModaliteValueChange?: (value: number) => void;
  modaliteUnit?: string;
  onModaliteUnitChange?: (value: string) => void;
}

// ⭐ Helper: foana rehefa 0 (tsy mampiseho "0" voalohany)
const displayValue = (n: number): string | number => (n === 0 ? '' : n);

// ⭐ Helper: manala "0" voalohany rehefa manoratra
const sanitizeNumeric = (raw: string, callback: (val: number) => void, max?: number) => {
  const cleaned = raw.replace(/^0+(?=\d)/, '');
  let val = Number(cleaned) || 0;
  if (max !== undefined) val = Math.max(0, Math.min(val, max));
  callback(val);
};

const FormField: React.FC<{ label: string; children: React.ReactNode; required?: boolean; }> = ({ label, children, required = false }) => {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[14px] font-semibold" style={{ color: theme.text }}>
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
};

const AchatsModalForm: React.FC<AchatsModalFormProps> = ({
  isOpen, onClose, onSubmit, fournisseurs, produits, selectedFournisseurId, onFournisseurChange,
  selectedProduits = [], onAddProduit, onUpdateQuantite, onRemoveProduit, onClearPanier,
  editingAchat = null, montantPaye = 0, onMontantPayeChange, isDark: propIsDark,
  tvaOverride = null, onTvaRateChange,
  fraisLivraison = 0, onFraisLivraisonChange,
  modePaiement = 'Espèces', onModePaiementChange,
  modaliteValue = 0, onModaliteValueChange,
  modaliteUnit = 'jours', onModaliteUnitChange
}) => {
  const { isDark: themeIsDark } = useTheme();
  const isDark = propIsDark ?? themeIsDark;
  const theme = isDark ? COLORS.dark : COLORS.light;
  const formRef = useRef<HTMLFormElement>(null);
  const [internalMontantPaye, setInternalMontantPaye] = useState(montantPaye);
  const [fournisseurSearch, setFournisseurSearch] = useState('');
  const [fournisseurOpen, setFournisseurOpen] = useState(false);

  const modalitePaiement = modaliteValue > 0 ? `${modaliteValue} ${modaliteUnit}` : 'Immediat';
  const modaliteMessage = modaliteValue > 0 ? `Paiement dans ${modaliteValue} ${modaliteUnit}.` : 'Paiement Immédiat';

  const safeSelectedProduits = useMemo(() => Array.isArray(selectedProduits) ? selectedProduits : [], [selectedProduits]);

  const totalHTProduits = useMemo(
    () => safeSelectedProduits.reduce((sum, item) => {
      const product = produits.find((p) => p.id === item.id);
      return product ? sum + (Number(product.prix_achat) || 0) * (Number(item.quantite) || 0) : sum;
    }, 0),
    [produits, safeSelectedProduits]
  );

  const totalHT = totalHTProduits + Number(fraisLivraison || 0);

  const totalTVA = useMemo(() => {
    return safeSelectedProduits.reduce((sum, item) => {
      const product = produits.find((p) => p.id === item.id);
      const tvaRate = Number.isFinite(Number(product?.tva_rate)) ? Number(product?.tva_rate) : 0.2;
      const lineTotalHT = (Number(product?.prix_achat) || 0) * (Number(item.quantite) || 0);
      return sum + (lineTotalHT * tvaRate);
    }, 0);
  }, [produits, safeSelectedProduits]);

  const totalTTC = totalHT + totalTVA;
  const montantPayeSafe = Math.max(0, Math.min(Number(internalMontantPaye) || 0, totalTTC));
  const resteAPayer = Math.max(0, totalTTC - montantPayeSafe);
  const statutPaiement = montantPayeSafe <= 0 ? 'Non payé' : montantPayeSafe >= totalTTC ? 'Payé' : 'Partiel';
  const statutConfig = statutPaiement === 'Payé'
    ? { color: theme.green, bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' }
    : statutPaiement === 'Partiel'
      ? { color: theme.amber, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' }
      : { color: theme.red, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' };

  useEffect(() => {
    if (!isOpen) return;
    setInternalMontantPaye(montantPaye);
    setFournisseurSearch('');
    setFournisseurOpen(false);
  }, [isOpen, montantPaye]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); formRef.current?.requestSubmit(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const tauxTVAApplique = 'Auto (Produits)';
  const headerBg = isDark ? theme.headerBg : '#FFFFFF';
  const headerTextColor = isDark ? theme.text : theme.text;
  const headerSubTextColor = isDark ? theme.muted : theme.muted;
  const headerCloseColor = isDark ? theme.muted : theme.muted;
  const headerCloseHover = isDark ? 'dark:hover:bg-white/5' : 'hover:bg-slate-100';
  const topBorderBg = isDark ? `linear-gradient(90deg, ${theme.primary}, ${theme.primaryHover})` : '#4F46E5';

  const inputClass = `h-11 w-full rounded-lg border px-3.5 text-[15px] font-medium outline-none transition-all focus:ring-2 dark:placeholder-gray-500`;
  const inputStyle = { background: theme.inputBg, borderColor: theme.border, color: theme.text };
  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = theme.primary;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.primaryBg}`;
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = theme.border;
    e.currentTarget.style.boxShadow = 'none';
  };

  const isDeliveryEnabled = selectedFournisseurId !== null && safeSelectedProduits.length > 0;
  const deliveryInputStyle = !isDeliveryEnabled
    ? { ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }
    : inputStyle;

  if (!isOpen) return null;

  const filteredFournisseurs = fournisseurs.filter(f => !fournisseurSearch || f.nom?.toLowerCase().includes(fournisseurSearch.toLowerCase()));
  const selectedFour = fournisseurs.find(f => f.id === selectedFournisseurId);
  const formatMoney = (value: number) => `${Number(value || 0).toLocaleString('fr-FR')} Ar`;

  const handleSelectFournisseur = (fournisseurId: number) => {
    if (Number(fournisseurId) !== Number(selectedFournisseurId)) {
      if (safeSelectedProduits.length > 0) {
        onClearPanier?.();
      }
    }
    onFournisseurChange(fournisseurId);
    setFournisseurOpen(false);
    setFournisseurSearch('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: isDark ? 'rgba(0,0,0,0.80)' : 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-4xl flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{ background: theme.card, borderColor: theme.border }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: topBorderBg }} />

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: headerBg, borderColor: theme.border }}>
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: headerTextColor }}>
              {editingAchat ? 'Modifier achat' : 'Nouvel achat'}
            </h2>
            <p className="text-[13.5px]" style={{ color: headerSubTextColor }}>Créer un achat fournisseur</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className={`flex h-9 w-9 items-center justify-center rounded-md text-[20px] leading-none ${headerCloseHover}`} style={{ color: headerCloseColor }}>×</button>
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="flex min-h-0 flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <FormField label="Fournisseur" required>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFournisseurOpen(!fournisseurOpen)}
                      className={`${inputClass} flex items-center justify-between text-left cursor-pointer`}
                      style={inputStyle}
                    >
                      <span className="truncate">
                        {selectedFour ? selectedFour.nom : 'Sélectionner un fournisseur'}
                      </span>
                      <span className={`ml-2 shrink-0 text-[12px] leading-none transition-transform ${fournisseurOpen ? 'rotate-180' : ''}`} style={{ color: theme.muted }}>▾</span>
                    </button>
                    {fournisseurOpen && (
                      <div className="absolute left-0 right-0 z-[999] mt-1.5 max-h-56 overflow-y-auto rounded-lg border shadow-xl" style={{ borderColor: theme.border, background: theme.card }} onMouseDown={(e) => e.preventDefault()}>
                        <div className="p-2 border-b sticky top-0" style={{ borderColor: theme.border, background: theme.card }}>
                          <input
                            autoFocus
                            value={fournisseurSearch}
                            onChange={(e) => setFournisseurSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className={`w-full h-11 rounded-md px-3.5 text-[15px] outline-none border`}
                            style={inputStyle}
                          />
                        </div>
                        <div className="py-1">
                          {filteredFournisseurs.length === 0 ? (
                            <div className="px-4 py-3 text-[15px]" style={{ color: theme.muted }}>Aucun fournisseur trouvé</div>
                          ) : filteredFournisseurs.map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => handleSelectFournisseur(f.id)}
                              className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                              style={{ color: theme.text }}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold truncate">{f.nom}</p>
                                <p className="text-[13px] truncate" style={{ color: theme.muted }}>{f.telephone} · {f.email}</p>
                              </div>
                              {f.id === selectedFournisseurId && (
                                <span className="text-[16px] leading-none" style={{ color: theme.primary }}>✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </FormField>

                <div className="overflow-hidden rounded-xl border h-[380px]" style={{ borderColor: theme.border, background: theme.card }}>
                  <AchatsProductSelector
                    produits={produits}
                    selectedProduits={safeSelectedProduits}
                    onAddProduit={onAddProduit}
                    onUpdateQuantite={onUpdateQuantite}
                    onRemoveProduit={onRemoveProduit}
                    onClearPanier={onClearPanier}
                    isDark={isDark}
                    selectedFournisseurId={selectedFournisseurId}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border p-5" style={{ borderColor: theme.border, background: theme.sectionBg }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[13px] uppercase tracking-wide font-medium" style={{ color: theme.muted }}>Total HT</span>
                      <span className="text-[18px] font-bold mt-1" style={{ color: theme.text }}>{formatMoney(totalHT)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] uppercase tracking-wide font-medium" style={{ color: theme.muted }}>TVA ({tauxTVAApplique})</span>
                      <span className="text-[18px] font-bold mt-1" style={{ color: theme.text }}>{formatMoney(totalTVA)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[15px] font-medium" style={{ color: theme.muted }}>TVA Rate</span>
                    <select
                      disabled
                      value="auto"
                      className="h-11 w-36 rounded-md border px-3 text-right text-[15.5px] font-semibold outline-none opacity-50 cursor-not-allowed focus:ring-2"
                      style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
                    >
                      <option value="auto">Auto (Produits)</option>
                    </select>
                  </div>

                  <div className="my-4 h-px" style={{ background: theme.border }} />

                  <div className="mb-4">
                    <label className="text-[15px] font-medium" style={{ color: theme.muted }}>Mode de paiement</label>
                    <div className="relative mt-1">
                      <select
                        value={modePaiement}
                        onChange={(e) => onModePaiementChange?.(e.target.value)}
                        className={`${inputClass} appearance-none cursor-pointer px-3.5 pr-9`}
                        style={inputStyle}
                      >
                        <option value="Espèces">Espèces</option>
                        <option value="Virement">Virement</option>
                        <option value="Chèque">Chèque</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Carte">Carte</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] leading-none text-slate-400">▾</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[15px] font-medium" style={{ color: theme.muted }}>Modalité de paiement</label>
                    <div className="mt-1 flex w-full flex-row items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        {/* ⭐ FIX: displayValue + sanitizeNumeric → tsy mampiseho "0" voalohany */}
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={displayValue(modaliteValue)}
                          onChange={(e) => sanitizeNumeric(e.target.value, (v) => onModaliteValueChange?.(v))}
                          className={`h-11 w-full rounded-lg border px-3.5 text-[15px] font-medium outline-none transition-all focus:ring-2 dark:placeholder-gray-500`}
                          style={{ ...inputStyle, MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none' }}
                          onFocus={focusStyle}
                          onBlur={blurStyle}
                        />
                      </div>
                      <select
                        value={modaliteUnit}
                        onChange={(e) => onModaliteUnitChange?.(e.target.value)}
                        className={`h-11 w-24 shrink-0 cursor-pointer appearance-none rounded-lg border px-3 pr-6 text-[15px] font-medium outline-none transition-all focus:ring-2 dark:placeholder-gray-500`}
                        style={inputStyle}
                      >
                        <option value="minutes">min</option>
                        <option value="heures">h</option>
                        <option value="jours">jours</option>
                        <option value="mois">mois</option>
                        <option value="annees">ans</option>
                      </select>
                    </div>
                    <p className="text-[13px] mt-1.5 font-medium" style={{ color: theme.green }}>{modaliteMessage}</p>
                  </div>

                  <div className="mb-4">
                    <label className="text-[15px] font-medium" style={{ color: theme.muted }}>Frais de livraison (Ar)</label>
                    <div className="relative mt-1">
                      {/* ⭐ FIX: displayValue + sanitizeNumeric → tsy mampiseho "0" voalohany */}
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder={isDeliveryEnabled ? "Ex: 5000" : "Sélectionnez un fournisseur et un produit"}
                        value={isDeliveryEnabled ? displayValue(fraisLivraison) : ''}
                        onChange={(e) => sanitizeNumeric(e.target.value, (v) => onFraisLivraisonChange?.(v))}
                        className={`${inputClass} px-3.5`}
                        style={deliveryInputStyle}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        disabled={!isDeliveryEnabled}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium" style={{ color: theme.muted }}>Montant payé</span>
                    {/* ⭐ FIX: displayValue + sanitizeNumeric → tsy mampiseho "0" voalohany */}
                    <input
                      type="number"
                      min="0"
                      max={totalTTC}
                      step="1"
                      placeholder="0"
                      value={displayValue(internalMontantPaye)}
                      onChange={(e) => {
                        sanitizeNumeric(e.target.value, (val) => {
                          setInternalMontantPaye(val);
                          onMontantPayeChange?.(val);
                        }, totalTTC);
                      }}
                      className="w-36 h-11 rounded-md border px-3 text-right text-[15.5px] font-semibold outline-none focus:ring-2"
                      style={{ background: theme.inputBg, borderColor: theme.border, color: theme.text }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[15px] font-medium" style={{ color: theme.muted }}>Reste à payer</span>
                    <span className="text-[15.5px] font-bold" style={{ color: theme.red }}>{formatMoney(resteAPayer)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[15px] font-medium" style={{ color: theme.muted }}>Statut</span>
                    <span className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold" style={{ color: statutConfig.color, background: statutConfig.bg, borderColor: statutConfig.border }}>
                      {statutPaiement}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border px-5 py-4 shadow-sm" style={{ background: theme.primaryBg, borderColor: theme.primary }}>
                  <span className="text-[17px] font-bold" style={{ color: theme.primary }}>Total TTC</span>
                  <span className="text-[23px] font-black tracking-tight" style={{ color: theme.primary }}>{formatMoney(totalTTC)}</span>
                </div>

                <input type="hidden" name="details_tva_rates" value={JSON.stringify(safeSelectedProduits.map(item => ({ id: item.id, quantite: item.quantite, tva_rate: (produits.find(p => p.id === item.id)?.tva_rate ?? 0.2) })))} />
                <input type="hidden" name="montant_paye" value={internalMontantPaye} />
                <input type="hidden" name="mode_paiement" value={modePaiement} />
                <input type="hidden" name="modalite_paiement" value={modalitePaiement} />
                <input type="hidden" name="frais_livraison" value={fraisLivraison} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-5 border-t" style={{ borderColor: theme.border, background: theme.softBg }}>
            <button onClick={onClose} className="px-5 py-3 rounded-lg text-[15px] font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" style={{ color: theme.muted }}>
              Annuler
            </button>
            <button type="submit" className="px-5 py-3 rounded-lg text-[15px] font-semibold text-white shadow-md transition-transform active:scale-[0.98] hover:shadow-lg" style={{ background: theme.primary }}>
              {editingAchat ? 'Enregistrer' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AchatsModalForm;