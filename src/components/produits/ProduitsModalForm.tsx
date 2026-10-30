// src/components/produits/ProduitsModalForm.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ ESORINA ny Statut (Actif/Inactif)
// ⭐ VAOVAO: Dropdown "Type de produit"
// ⭐ NOUVEAU: SEARCH ao amin'ny dropdowns
// ⭐ NOUVEAU: Code produit READONLY + Auto-généré
// ⭐ FIX LOGIQUE ERP STANDARD (Odoo-style):
//    - Prix de vente : 'fini' IHANY (required)
//    - Prix d'achat  : required ho 'matiere_premiere', facultatif hafa
//    - Fournisseur   : required ho 'matiere_premiere'
//    - Stock initial : ASEHO FOANA (type rehetra, facultatif, 0 par défaut)
//    - Stock minimum : ASEHO FOANA (type rehetra, facultatif)
// ⭐ FIX: NESORINA ny étoile `*` sy ny badge "Requis"
// ⭐ FIX: NESORINA ny "hint" sy icon Info
// ⭐ FIX: Badge "Optionnel" → INDIGO (brand) ho design tsara kokoa

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Produit {
  id?: number;
  code?: string;
  nom?: string;
  description?: string;
  categorie_id?: number | null;
  fournisseur_id?: number | null;
  prix_achat?: number;
  prix_vente?: number;
  quantite_stock?: number;
  quantite_minimale?: number;
  unite?: string;
  tva_rate?: number;
  type_produit?: string;
}

interface Category { id: number; nom?: string; name?: string; }
interface Fournisseur { id: number; nom?: string; name?: string; }

interface ProduitsModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  editingProduit?: Produit | null;
  categories?: Category[];
  fournisseurs?: Fournisseur[];
  generateCode: (nom?: string) => string;
  isDark?: boolean;
}

const UNITES = [
  { value: 'pièce', label: 'Pièce' },
  { value: 'L', label: 'Litre (L)' },
  { value: 'ml', label: 'Millilitre (ml)' },
  { value: 'KG', label: 'Kilogramme (KG)' },
  { value: 'g', label: 'Gramme (g)' },
  { value: 'pot', label: 'Pot' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'carton', label: 'Carton' },
];

const TVA_RATES = [
  { value: 0.2, label: 'TVA 20% (Standard)' },
  { value: 0.1, label: 'TVA 10% (Réduit)' },
  { value: 0.0, label: 'TVA 0% (Exonéré)' },
];

const TYPE_PRODUIT_OPTIONS = [
  { value: 'fini', label: 'Produit fini (vente)' },
  { value: 'matiere_premiere', label: 'Matière première (achat)' },
  { value: 'fourniture', label: 'Fourniture (interne)' },
];

// ⭐ Config amin'ny saha "Prix d'achat"
function getPrixAchatConfig(type: string): {
  label: string;
  placeholder: string;
  required: boolean;
} {
  switch (type) {
    case 'fini':
      return {
        label: 'Coût de production (Ar)',
        placeholder: 'Estimation',
        required: false,
      };
    case 'matiere_premiere':
      return {
        label: 'Prix d\'achat (Ar)',
        placeholder: '0',
        required: true,
      };
    case 'fourniture':
      return {
        label: 'Prix d\'achat (Ar)',
        placeholder: '0',
        required: false,
      };
    default:
      return {
        label: 'Prix d\'achat (Ar)',
        placeholder: '0',
        required: false,
      };
  }
}

// ⭐ FormField — NESORINA ny étoile `*` sy "Requis"
// ⭐ "Optionnel" → INDIGO (brand) ho design tsara
const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  required?: boolean;
  fullWidth?: boolean;
  showOptional?: boolean;
}> = ({ label, children, fullWidth = false, showOptional = false }) => (
  <div className={`min-w-0 ${fullWidth ? 'w-full' : ''}`}>
    <label className="mb-1.5 flex items-center gap-1.5 text-[14px] font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      {showOptional && (
        <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-400">
          Optionnel
        </span>
      )}
    </label>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════
// SEARCHABLE DROPDOWN
// ═══════════════════════════════════════════════════════════
interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  inputClass: string;
  isDark: boolean;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  emptyMessage?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value, onChange, options, placeholder = 'Sélectionner',
  searchPlaceholder = 'Rechercher...', inputClass, isDark,
  isOpen, onToggle, emptyMessage = 'Aucun résultat',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timer = window.setTimeout(() => searchInputRef.current?.focus(), 30);
      return () => window.clearTimeout(timer);
    }
    if (!isOpen) setSearchTerm('');
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(o =>
      o.label.toLowerCase().includes(term) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(o => o.value === value);
  const displayValue = selectedOption?.label || placeholder;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        className={`${inputClass} flex items-center justify-between text-left cursor-pointer`}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown
          size={18}
          className={`ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'rgb(148 163 184)' }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-lg border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="border-b border-slate-200 dark:border-white/[0.08] p-2">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-md border border-slate-200 dark:border-white/[0.10] bg-slate-50 dark:bg-slate-800 pl-8 pr-8 text-[14px] text-slate-900 dark:text-slate-100 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
                  aria-label="Effacer la recherche"
                >
                  <X size={12} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3.5 py-4 text-center text-[14px] text-slate-400 dark:text-slate-500">
                {emptyMessage}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); onToggle(false); }}
                  className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                    value === opt.value
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{opt.label}</p>
                    {opt.sublabel && (
                      <p className="truncate text-[12.5px] text-slate-400 dark:text-slate-500">{opt.sublabel}</p>
                    )}
                  </div>
                  {value === opt.value && <Check size={16} className="text-brand-500 shrink-0 ml-2" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProduitsModalForm: React.FC<ProduitsModalFormProps> = ({
  isOpen, onClose, onSubmit, editingProduit, categories = [],
  fournisseurs = [], generateCode, isDark: propIsDark,
}) => {
  const { isDark: themeIsDark } = useTheme();
  const isDark = propIsDark !== undefined ? propIsDark : themeIsDark;
  const formRef = useRef<HTMLFormElement>(null);

  const [codeValue, setCodeValue] = useState<string>(editingProduit?.code || '');
  const [nomValue, setNomValue] = useState<string>(editingProduit?.nom || '');

  const [selectedCategorie, setSelectedCategorie] = useState<string | number>(editingProduit?.categorie_id ?? '');
  const [selectedFournisseur, setSelectedFournisseur] = useState<string | number>(editingProduit?.fournisseur_id ?? '');
  const [selectedUnite, setSelectedUnite] = useState<string>(editingProduit?.unite || 'pièce');
  const [selectedTvaRate, setSelectedTvaRate] = useState<number>(editingProduit?.tva_rate ?? 0.2);
  const [selectedType, setSelectedType] = useState<string>(editingProduit?.type_produit || 'fini');

  const [categorieOpen, setCategorieOpen] = useState(false);
  const [fournisseurOpen, setFournisseurOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  // ⭐ Boolean types
  const isFini = selectedType === 'fini';
  const isMatiere = selectedType === 'matiere_premiere';
  const isFourniture = selectedType === 'fourniture';

  // ⭐ Fournisseur obligatoire ho matière première
  const fournisseurRequired = isMatiere;

  const prixAchatConfig = useMemo(
    () => getPrixAchatConfig(selectedType),
    [selectedType]
  );

  const categorieOptions: DropdownOption[] = useMemo(() =>
    categories.map(c => ({
      value: String(c.id),
      label: c.nom || c.name || `Catégorie #${c.id}`,
    })), [categories]);

  const fournisseurOptions: DropdownOption[] = useMemo(() =>
    fournisseurs.map(f => ({
      value: String(f.id),
      label: f.nom || f.name || `Fournisseur #${f.id}`,
    })), [fournisseurs]);

  const typeOptions: DropdownOption[] = useMemo(() =>
    TYPE_PRODUIT_OPTIONS.map(t => ({
      value: t.value,
      label: t.label,
    })), []);

  useEffect(() => {
    if (!isOpen) return;
    setNomValue(editingProduit?.nom || '');
    setCodeValue(editingProduit?.code || '');
    setSelectedCategorie(editingProduit?.categorie_id ?? '');
    setSelectedFournisseur(editingProduit?.fournisseur_id ?? '');
    setSelectedUnite(editingProduit?.unite || 'pièce');
    setSelectedTvaRate(editingProduit?.tva_rate ?? 0.2);
    setSelectedType(editingProduit?.type_produit || 'fini');
    setCategorieOpen(false);
    setFournisseurOpen(false);
    setTypeOpen(false);
  }, [isOpen, editingProduit]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingProduit) return;
    const nom = (nomValue || '').trim();
    if (nom.length < 2) { setCodeValue(''); return; }
    const newCode = generateCode(nom);
    setCodeValue(newCode);
  }, [nomValue, isOpen, editingProduit, generateCode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (categorieOpen || fournisseurOpen || typeOpen) {
          setCategorieOpen(false);
          setFournisseurOpen(false);
          setTypeOpen(false);
          return;
        }
        event.preventDefault();
        onClose();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'enter') {
        event.preventDefault();
        const form = document.getElementById('produit-modal-form') as HTMLFormElement | null;
        form?.requestSubmit();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, categorieOpen, fournisseurOpen, typeOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  if (!isOpen) return null;

  const inputClass = `h-11 w-full rounded-lg border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] px-3.5 text-[15px] font-medium text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20`;

  const readonlyClass = `h-11 w-full rounded-lg border border-slate-200 dark:border-white/[0.10] bg-slate-50 dark:bg-white/[0.03] px-3.5 text-[15px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed select-none`;

  const modal = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="produit-modal-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="relative z-[100000] flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0F172A] shadow-[0_24px_70px_rgba(0,0,0,0.25)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand-500" />

        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 id="produit-modal-title" className="truncate text-[18px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {editingProduit ? 'Modifier le produit' : 'Nouveau produit'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <form id="produit-modal-form" onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <FormField label="Désignation">
                <input
                  type="text"
                  name="nom"
                  value={nomValue}
                  onChange={(e) => setNomValue(e.target.value)}
                  placeholder="Designation"
                  required
                  autoFocus={!editingProduit}
                  className={inputClass}
                />
              </FormField>

              <FormField label="Code produit (auto)">
                <input
                  type="text"
                  name="code"
                  value={codeValue}
                  readOnly
                  tabIndex={-1}
                  placeholder="AUTO"
                  aria-label="Code produit généré automatiquement"
                  className={readonlyClass}
                />
              </FormField>

              <FormField label="Type de produit">
                <SearchableDropdown
                  value={selectedType}
                  onChange={(v) => setSelectedType(v)}
                  options={typeOptions}
                  placeholder="Sélectionner un type"
                  searchPlaceholder="Rechercher un type..."
                  inputClass={inputClass}
                  isDark={isDark}
                  isOpen={typeOpen}
                  onToggle={(open) => {
                    setTypeOpen(open);
                    if (open) { setCategorieOpen(false); setFournisseurOpen(false); }
                  }}
                  emptyMessage="Aucun type trouvé"
                />
                <input type="hidden" name="type_produit" value={selectedType} readOnly />
              </FormField>

              <FormField label="Catégorie">
                <SearchableDropdown
                  value={String(selectedCategorie ?? '')}
                  onChange={(v) => setSelectedCategorie(v)}
                  options={categorieOptions}
                  placeholder="Sélectionner une catégorie"
                  searchPlaceholder="Rechercher une catégorie..."
                  inputClass={inputClass}
                  isDark={isDark}
                  isOpen={categorieOpen}
                  onToggle={(open) => {
                    setCategorieOpen(open);
                    if (open) { setFournisseurOpen(false); setTypeOpen(false); }
                  }}
                  emptyMessage="Aucune catégorie trouvée"
                />
                <input type="hidden" name="categorie_id" value={selectedCategorie} readOnly />
              </FormField>

              <FormField
                label="Fournisseur"
                showOptional={!fournisseurRequired}
              >
                <SearchableDropdown
                  value={String(selectedFournisseur ?? '')}
                  onChange={(v) => setSelectedFournisseur(v)}
                  options={fournisseurOptions}
                  placeholder="Sélectionner un fournisseur"
                  searchPlaceholder="Rechercher un fournisseur..."
                  inputClass={inputClass}
                  isDark={isDark}
                  isOpen={fournisseurOpen}
                  onToggle={(open) => {
                    setFournisseurOpen(open);
                    if (open) { setCategorieOpen(false); setTypeOpen(false); }
                  }}
                  emptyMessage="Aucun fournisseur trouvé"
                />
                <input type="hidden" name="fournisseur_id" value={selectedFournisseur} readOnly />
              </FormField>

              <FormField
                label={prixAchatConfig.label}
                showOptional={!prixAchatConfig.required}
              >
                <input
                  type="number"
                  name="prix_achat"
                  key={selectedType}
                  defaultValue={editingProduit?.prix_achat ?? 0}
                  min="0"
                  step="1"
                  placeholder={prixAchatConfig.placeholder}
                  className={inputClass}
                />
              </FormField>

              {/* ⭐ Prix de vente → 'fini' IHANY */}
              {isFini && (
                <FormField label="Prix de vente (Ar)">
                  <input
                    type="number"
                    name="prix_vente"
                    defaultValue={editingProduit?.prix_vente ?? 0}
                    min="0"
                    step="1"
                    placeholder="0"
                    required
                    className={inputClass}
                  />
                </FormField>
              )}

              {/* ⭐ Stock initial → ASEHO FOANA */}
              <FormField label="Stock initial" showOptional>
                <input
                  type="number"
                  name="quantite_stock"
                  key={`stock-${selectedType}`}
                  defaultValue={editingProduit?.quantite_stock ?? 0}
                  min="0"
                  step="1"
                  placeholder="0"
                  className={inputClass}
                />
              </FormField>

              {/* ⭐ Stock minimum → ASEHO FOANA */}
              <FormField label="Stock minimum" showOptional>
                <input
                  type="number"
                  name="quantite_minimale"
                  key={`min-${selectedType}`}
                  defaultValue={editingProduit?.quantite_minimale ?? 5}
                  min="0"
                  step="1"
                  placeholder="5"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Unité">
                <div className="relative">
                  <select value={selectedUnite} onChange={(e) => setSelectedUnite(e.target.value)} className={`${inputClass} appearance-none cursor-pointer pr-10`}>
                    {UNITES.map((unite) => (<option key={unite.value} value={unite.value}>{unite.label}</option>))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input type="hidden" name="unite" value={selectedUnite} readOnly />
                </div>
              </FormField>

              <FormField label="Taux de TVA">
                <div className="relative">
                  <select value={selectedTvaRate} onChange={(e) => setSelectedTvaRate(Number(e.target.value))} className={`${inputClass} appearance-none cursor-pointer pr-10`}>
                    {TVA_RATES.map((rate) => (<option key={rate.value} value={rate.value}>{rate.label}</option>))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input type="hidden" name="tva_rate" value={selectedTvaRate} readOnly />
                </div>
              </FormField>

              <div className="md:col-span-3">
                <FormField label="Description" showOptional>
                  <textarea name="description" defaultValue={editingProduit?.description || ''} placeholder="Description du produit..." rows={3} className={`${inputClass} h-auto resize-none py-3 leading-6`} />
                </FormField>
              </div>

            </div>
          </div>

          <footer className="flex h-[72px] shrink-0 items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#1E293B] px-5">
            <button type="button" onClick={onClose} className="h-10 rounded-lg px-4.5 text-[15px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]">Annuler</button>
            <button type="submit" className="flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md active:scale-[0.98]">
              {editingProduit ? <Check size={17} /> : <Plus size={17} />}
              {editingProduit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ProduitsModalForm;