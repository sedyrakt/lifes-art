// src/components/achats/AchatsProductSelector.tsx
// ⭐ FONT SIZE: +0.5px amin'ny rehetra
// ⭐ TSY MISY ICON — nalana daholo
// ⭐ Filtre produits par fournisseur (selectedFournisseurId)
// ⭐ FIX: Filtre `type_produit !== 'fini'` + fallback ho an'ny produits legacy
// ⭐ FIX CRITIQUE: ESORINA ny stock validation — afaka mividy na dia 0 aza ny stock
// ⭐ FIX: input quantité tsy mampiseho "0" voalohany (01 → 1)

import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const COLORS = {
  light: {
    border: '#E2E8F0', text: '#0F172A', muted: '#64748B', subMuted: '#94A3B8',
    primary: '#4F46E5', soft: '#F8FAFC', bg: '#FFFFFF', red: '#DC2626',
    primaryBg: 'rgba(79,70,229,0.06)'
  },
  dark: {
    border: 'rgba(255,255,255,0.12)', text: '#F8FAFC', muted: '#94A3B8', subMuted: '#94A3B8',
    primary: '#4F46E5', soft: '#1E293B', bg: '#0F172A', red: '#F87171',
    primaryBg: 'rgba(79,70,229,0.12)'
  }
};

interface Produit {
  id: number;
  nom: string;
  code: string;
  prix_achat: number;
  quantite_stock: number;
  unite?: string;
  tva_rate?: number;
  fournisseur_id?: number | null;
  type_produit?: string;
}

interface SelectedProduct {
  id: number;
  quantite: number;
  tva_rate?: number;
}

interface Props {
  produits: Produit[];
  selectedProduits: SelectedProduct[];
  onAddProduit: (id: number, quantite: number, tva_rate?: number) => void;
  onUpdateQuantite: (id: number, quantite: number) => void;
  onRemoveProduit: (id: number) => void;
  onClearPanier: () => void;
  isDark: boolean;
  selectedFournisseurId: number | null;
}

// ⭐ Helper: foana rehefa 0 na tsy misy
const displayNumeric = (val: string | number): string | number => {
  const s = String(val ?? '').trim();
  if (s === '' || s === '0') return '';
  return s;
};

const AchatsProductSelector: React.FC<Props> = ({
  produits,
  selectedProduits,
  onAddProduit,
  onUpdateQuantite,
  onRemoveProduit,
  onClearPanier,
  isDark,
  selectedFournisseurId,
}) => {
  const { isDark: contextIsDark } = useTheme();
  const dark = isDark ?? contextIsDark;
  const theme = dark ? COLORS.dark : COLORS.light;

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityValue, setQuantityValue] = useState('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ⭐ FILTRE: produits an'ny fournisseur voafidy IHANY + tsy "fini"
  const produitsFournisseur = useMemo(() => {
    if (selectedFournisseurId === null || selectedFournisseurId === undefined) return [];
    return produits.filter(p => {
      const matchFournisseur = Number(p.fournisseur_id) === Number(selectedFournisseurId);
      if (!matchFournisseur) return false;

      const typeVal = String(p.type_produit || '').toLowerCase().trim();
      const typeOk = typeVal !== 'fini';
      return typeOk;
    });
  }, [produits, selectedFournisseurId]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return produitsFournisseur.filter(
      p => p.nom.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)
    );
  }, [produitsFournisseur, searchTerm]);

  const selectedProduct = produits.find(p => p.id === Number(selectedProductId));

  const add = () => {
    const id = Number(selectedProductId);
    const product = produits.find(p => p.id === id);
    const qty = Number(quantityValue) || 1;
    if (!product) return;

    if (qty <= 0) {
      setErrorMessage('La quantité doit être supérieure à 0.');
      return;
    }

    const existing = selectedProduits.find(i => i.id === id);
    const tvaRate = Number.isFinite(Number(product.tva_rate)) ? Number(product.tva_rate) : 0;

    if (existing) {
      onUpdateQuantite(id, existing.quantite + qty);
    } else {
      onAddProduit(id, qty, tvaRate);
    }

    setSelectedProductId('');
    setQuantityValue('1');
    setSearchTerm('');
    setIsOpen(false);
    setErrorMessage('');
  };

  const handleIncrement = (_product: Produit, item: SelectedProduct) => {
    setErrorMessage('');
    onUpdateQuantite(item.id, item.quantite + 1);
  };

  const handleDecrement = (item: SelectedProduct) => {
    setErrorMessage('');
    onUpdateQuantite(item.id, Math.max(1, item.quantite - 1));
  };

  const total = selectedProduits.reduce((sum, item) => {
    const p = produits.find(x => x.id === item.id);
    return p ? sum + p.prix_achat * item.quantite : sum;
  }, 0);

  const inputStyle = { background: theme.bg, borderColor: theme.border, color: theme.text };
  const noFournisseur = selectedFournisseurId === null || selectedFournisseurId === undefined;

  return (
    <div className="p-4 space-y-3.5">
      <div className="relative">
        <input
          value={isOpen ? searchTerm : ''}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setErrorMessage('');
          }}
          onFocus={() => {
            if (!noFournisseur) setIsOpen(true);
          }}
          disabled={noFournisseur}
          placeholder={noFournisseur ? "Sélectionnez un fournisseur d'abord" : 'Rechercher un produit...'}
          className={`w-full h-11 rounded-lg border px-3.5 text-[15px] outline-none focus:ring-2 ${noFournisseur ? 'cursor-not-allowed opacity-60' : ''}`}
          style={inputStyle}
        />

        {isOpen && !noFournisseur && (
          <div
            className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 overflow-y-auto rounded-lg border shadow-lg"
            style={{ borderColor: theme.border, background: theme.bg }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-[15px] text-slate-500">
                {produitsFournisseur.length === 0
                  ? 'Aucun produit d\'achat pour ce fournisseur'
                  : 'Aucun produit trouvé'}
              </div>
            ) : filtered.map(p => {
              const tvaRate = Number.isFinite(Number(p.tva_rate)) ? Number(p.tva_rate) : 0;
              const stockInfo = p.quantite_stock > 0
                ? ` · Stock: ${p.quantite_stock}`
                : ` · Stock actuel: 0`;

              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => {
                    setSelectedProductId(String(p.id));
                    setIsOpen(false);
                    setSearchTerm('');
                    setErrorMessage('');
                    setQuantityValue('1');
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold truncate" style={{ color: theme.text }}>
                      {p.nom}
                    </p>
                    <p className="text-[14.5px] truncate" style={{ color: theme.muted }}>
                      {p.code} · TVA {(tvaRate * 100).toFixed(0)}%{stockInfo}
                    </p>
                  </div>
                  <span
                    className="text-[15px] font-semibold"
                    style={{ color: theme.primary }}
                  >
                    {p.prix_achat.toLocaleString('fr-FR')} Ar
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="border rounded-xl p-3.5 space-y-3" style={{ borderColor: theme.primary, background: theme.soft }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold truncate" style={{ color: theme.text }}>
                {selectedProduct.nom}
              </p>
              <p className="text-[14.5px] truncate" style={{ color: theme.muted }}>
                {selectedProduct.code} · TVA {((Number.isFinite(Number(selectedProduct.tva_rate)) ? Number(selectedProduct.tva_rate) : 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[15px] font-bold" style={{ color: theme.primary }}>
                {selectedProduct.prix_achat.toLocaleString('fr-FR')} Ar
              </p>
              <p className="text-[12.5px] text-slate-500">
                Stock actuel: {selectedProduct.quantite_stock}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProductId('')}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[18px] leading-none hover:bg-slate-100 dark:hover:bg-white/5"
              style={{ color: theme.muted }}
            >
              ×
            </button>
          </div>
          <div className="flex gap-2">
            {/* ⭐ FIX: displayNumeric + regex manala "0" voalohany */}
            <input
              type="number"
              min="1"
              placeholder="1"
              value={displayNumeric(quantityValue)}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/^0+(?=\d)/, '');
                setQuantityValue(cleaned);
                setErrorMessage('');
              }}
              className="w-24 h-11 rounded-lg border text-center text-[15.5px] font-semibold outline-none focus:ring-2"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={add}
              className="flex-1 h-11 rounded-lg text-[15px] font-bold text-white transition hover:opacity-90"
              style={{ background: theme.primary }}
            >
              + Ajouter
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          className="relative px-3.5 py-2.5 rounded-lg border text-[14px] font-medium"
          style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: theme.red }}
        >
          <span className="block pr-6">⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-[18px] leading-none text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {selectedProduits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5 text-center">
          <p className="text-[14.5px]" style={{ color: theme.muted }}>Panier vide</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {selectedProduits.map(item => {
            const p = produits.find(x => x.id === item.id);
            if (!p) return null;
            const lineTotal = p.prix_achat * item.quantite;
            const tvaRate = Number.isFinite(Number(p.tva_rate)) ? Number(p.tva_rate) : 0;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border rounded-lg px-3.5 py-2.5"
                style={{ borderColor: theme.border }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold truncate" style={{ color: theme.text }}>{p.nom}</p>
                  <p className="text-[14px]" style={{ color: theme.muted }}>
                    {p.prix_achat.toLocaleString('fr-FR')} Ar · TVA {(tvaRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDecrement(item)}
                    className="w-9 h-9 flex items-center justify-center rounded-md border text-[16px] leading-none font-bold hover:bg-slate-100 dark:hover:bg-white/5"
                    style={{ borderColor: theme.border, color: theme.muted }}
                  >
                    −
                  </button>
                  <span className="w-9 text-center text-[15.5px] font-semibold" style={{ color: theme.text }}>
                    {item.quantite}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleIncrement(p, item)}
                    className="w-9 h-9 flex items-center justify-center rounded-md border text-[16px] leading-none font-bold hover:bg-slate-100 dark:hover:bg-white/5"
                    style={{ borderColor: theme.border, color: theme.muted }}
                  >
                    +
                  </button>
                </div>
                <span className="text-[15.5px] font-bold" style={{ color: theme.primary }}>
                  {lineTotal.toLocaleString('fr-FR')} Ar
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveProduit(item.id)}
                  className="flex h-6 w-6 items-center justify-center rounded text-[18px] leading-none text-slate-400 hover:text-danger-500"
                >
                  ×
                </button>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: theme.border }}>
            <span className="text-[13.5px] font-semibold uppercase" style={{ color: theme.muted }}>Total</span>
            <span className="text-[15.5px] font-bold" style={{ color: theme.primary }}>
              {total.toLocaleString('fr-FR')} Ar
            </span>
          </div>

          {selectedProduits.length > 0 && (
            <button
              type="button"
              onClick={onClearPanier}
              className="w-full text-[14.5px] text-slate-400 hover:text-danger-500 text-center py-1"
            >
              Vider le panier
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AchatsProductSelector;