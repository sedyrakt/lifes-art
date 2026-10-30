// src/components/paiements/PaiementsTable.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ TYPOGRAPHIE alignée sur CommandesTable
// ⭐ fontSize : header 12.5px, cells 14px, footer 13px
// ⭐ FIX: Couleur de fond amin'ny ellipsis button rehefa dark mode
// ⭐ NOUVEAU: Cellule Employé — Anarana IHANY (nesorina ny poste)
// ⭐ NOUVEAU: Colonne "Statut" — StatusBadge (Payé / Brouillon / Non payé)
// ⭐ FIX: Footer "En attente" = ny AMBINY tokony aloa (net − montant)
// ⭐ FIX: Avance tsy alaina INDROA (avance efa tao amin'ny net)

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, Edit, Trash2, Plus, CreditCard, CheckCircle2, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusBadge } from './StatusBadge';

interface Paiement {
  id: number;
  employe_id: number;
  employe_nom: string;
  employe_prenom: string;
  employe_poste: string;
  mois: number;
  annee: number;
  montant: number;
  mode_paiement: string;
  date_paiement: string;
  reference?: string;
  observation?: string;
  statut?: string;
  avance?: number;
  salaire_brut?: number;
  cnaps?: number;
  ostie?: number;
  irsa?: number;
  absences_deduction?: number;
  heures_sup_montant?: number;
  autres_retenues?: number;
}

interface PaiementsTableProps {
  paiements: Paiement[];
  moisLabels: string[];
  onViewHistorique?: (employeId: number) => void;
  onEdit: (paiement: Paiement) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  selectedIds?: Set<number>;
  onSelectAll?: (checked: boolean) => void;
  onSelectOne?: (id: number, checked: boolean) => void;
  onBulkDelete?: (ids: number[]) => void;
  onValidate?: (paiement: Paiement) => void;
  onBulletin?: (paiement: Paiement) => void;
}

interface MenuPosition { top?: number; bottom?: number; left?: number; right?: number; }

const MENU_WIDTH = 220;
const MENU_HEIGHT = 220;
const MENU_PADDING = 12;

const safeNumber = (value: unknown, fallback = 0): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatDate = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};

const getEmployeeName = (paiement: Paiement): string => {
  const firstName = paiement.employe_prenom?.trim() || '';
  const lastName = paiement.employe_nom?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || 'Employé inconnu';
};

// ⭐⭐⭐ FIX: Ny AMBINY tokony aloa (net − montant) ⭐⭐⭐
// Ny net à payer dia efa nisy ny avance no nesorina
// Noho izany, ny "Reste à payer" = net − montant (fa tsy net − avance − montant)
const computeResteAPayer = (p: Paiement): number => {
  const brut = safeNumber(p.salaire_brut);
  const hsMontant = safeNumber(p.heures_sup_montant);
  const cnaps = safeNumber(p.cnaps);
  const ostie = safeNumber(p.ostie);
  const irsa = safeNumber(p.irsa);
  const absences = safeNumber(p.absences_deduction);
  const autresRetenues = safeNumber(p.autres_retenues);
  const avanceP = safeNumber(p.avance);
  const montantP = safeNumber(p.montant);

  // ⭐ Net à payer (avance efa nesorina tao)
  const totalRetenues = cnaps + ostie + irsa + avanceP + absences + autresRetenues;
  const netAPayer = Math.max(0, brut + hsMontant - totalRetenues);

  // ⭐ Reste à payer = net à payer − montant (avance efa tao amin'ny net)
  const reste = Math.max(0, netAPayer - montantP);
  return reste;
};

// ════════════════════════════════════════════════════════════
// MENU BUTTON
// ════════════════════════════════════════════════════════════

interface MenuButtonProps {
  icon?: React.ReactNode;
  label: string;
  tone?: 'default' | 'emerald' | 'danger' | 'sky' | 'amber';
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ icon, label, tone = 'default', onMouseDown }) => {
  const toneClass =
    tone === 'emerald' ? 'text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10' :
    tone === 'sky' ? 'text-slate-700 hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-sky-500/10' :
    tone === 'amber' ? 'text-slate-700 hover:bg-amber-50 dark:text-slate-200 dark:hover:bg-amber-500/10' :
    tone === 'danger' ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10' :
    'text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-brand-500/10';

  const iconClass =
    tone === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' :
    tone === 'sky' ? 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' :
    tone === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' :
    tone === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' :
    'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400';

  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      className={`group flex w-full items-center gap-2.5 px-3 py-2 text-left font-medium transition-colors ${toneClass}`}
    >
      {icon && <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconClass}`}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

// ════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════

const PaiementsTable: React.FC<PaiementsTableProps> = ({
  paiements = [], moisLabels = [], onViewHistorique, onEdit, onDelete, onAdd,
  selectedIds = new Set<number>(), onSelectAll, onSelectOne, onBulkDelete, onValidate, onBulletin,
}) => {
  const { isDark } = useTheme();

  const tableBackground = isDark ? 'bg-[#0F172A]' : 'bg-white';
  const tableSecondaryBackground = isDark ? 'bg-[#0F172A]' : 'bg-slate-50';
  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-200';
  const cellBorderColor = isDark ? 'border-white/[0.10]' : 'border-slate-200';
  const headerBorderColor = isDark ? 'border-white/[0.15]' : 'border-slate-200';

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  const safePaiements = paiements || [];
  const safeSelectedIds = selectedIds || new Set<number>();

  // ⭐⭐⭐ Stats — footer breakdown Payé / En attente ⭐⭐⭐
  const stats = useMemo(() => {
    const total = safePaiements.length;
    const totalMontant = safePaiements.reduce((sum, paiement) => sum + safeNumber(paiement.montant), 0);
    const totalAvance = safePaiements.reduce((sum, paiement) => sum + safeNumber(paiement.avance), 0);

    const employesUniques = new Set(
      safePaiements
        .map((paiement) => paiement.employe_id)
        .filter((id) => id !== null && id !== undefined && Number(id) > 0)
    ).size;

    // ⭐ Payé : statut = 'Payé'
    const payes = safePaiements.filter((p) => String(p.statut || '').trim() === 'Payé');
    const totalPaye = payes.reduce((sum, p) => sum + safeNumber(p.montant), 0);

    // ⭐ En attente : statut = 'Non payé' na 'Brouillon'
    const enAttente = safePaiements.filter((p) => {
      const s = String(p.statut || '').trim();
      return s === 'Non payé' || s === 'Brouillon';
    });

    // ⭐ Ny "En attente" dia ny AMBINY tokony aloa (net − montant)
    const totalEnAttente = enAttente.reduce((sum, p) => sum + computeResteAPayer(p), 0);

    return {
      total,
      totalMontant,
      totalAvance,
      employesUniques,
      nbPayes: payes.length,
      nbEnAttente: enAttente.length,
      totalPaye,
      totalEnAttente,
    };
  }, [safePaiements]);

  const allSelected = safePaiements.length > 0 && safePaiements.every((paiement) => safeSelectedIds.has(paiement.id));
  const someSelected = safeSelectedIds.size > 0 && !allSelected;

  const currentPaiement = useMemo(
    () => (openMenuId === null ? null : safePaiements.find((paiement) => paiement.id === openMenuId) ?? null),
    [safePaiements, openMenuId]
  );

  useEffect(() => {
    if (openMenuId === null) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setOpenMenuId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpenMenuId(null); }
    };
    const handleScroll = () => setOpenMenuId(null);
    const handleResize = () => setOpenMenuId(null);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [openMenuId]);

  const toggleMenu = useCallback((id: number, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (openMenuId === id) { setOpenMenuId(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const position: MenuPosition = {};
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < MENU_HEIGHT + MENU_PADDING && spaceAbove > MENU_HEIGHT + MENU_PADDING) {
      position.bottom = viewportHeight - rect.top + 4;
    } else {
      position.top = rect.bottom + 4;
    }
    const spaceRight = viewportWidth - rect.right;
    if (spaceRight < MENU_WIDTH + MENU_PADDING && rect.left > MENU_WIDTH + MENU_PADDING) {
      position.right = viewportWidth - rect.right + 4;
    } else {
      position.left = Math.max(MENU_PADDING, rect.right - MENU_WIDTH);
    }
    setMenuPosition(position);
    setOpenMenuId(id);
  }, [openMenuId]);

  const handleMenuAction = useCallback((callback: () => void, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenMenuId(null);
    callback();
  }, []);

  if (safePaiements.length === 0) {
    return (
      <div className={`flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-xl border px-6 py-14 text-center shadow-sm ${tableBackground} ${borderColor}`}>
       
        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">Aucun paiement</h3>
        <p className="mt-2 max-w-[390px] text-[14px] leading-6 text-slate-500 dark:text-slate-400">
          Ajoutez un paiement pour commencer à suivre les rémunérations.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-600"
        >
          <Plus size={17} />
          Ajouter un paiement
        </button>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border-[0.5px] shadow-sm ${tableBackground} ${borderColor}`}>
      {safeSelectedIds.size > 0 && (
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${isDark ? 'border-white/[0.08] bg-brand-500/[0.06]' : 'border-brand-100 bg-brand-50'}`}>
          <span className="text-[14px] font-semibold text-brand-600 dark:text-brand-400">
            {safeSelectedIds.size} paiement{safeSelectedIds.size > 1 ? 's' : ''} sélectionné{safeSelectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onBulkDelete?.(Array.from(safeSelectedIds))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-2.5 py-1.5 text-[14px] font-semibold text-white shadow-sm hover:bg-red-600"
            >
              <Trash2 size={14} />
              Supprimer
            </button>
            <button
              type="button"
              onClick={() => onSelectAll?.(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[14px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/[0.12] dark:bg-[#0F172A] dark:text-slate-300"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      <div className="custom-scrollbar scrollbar-gutter-stable overflow-x-auto overflow-y-auto">
        <table className={`w-full min-w-[1100px] table-fixed border-collapse text-left ${borderColor}`}>
          <thead className={`sticky top-0 z-20 backdrop-blur-xl ${isDark ? 'bg-[#0F172A]/97' : 'bg-slate-50/97'}`}>
            <tr className="text-[12.5px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
              <th scope="col" className={`w-[36px] border-b px-1.5 py-2.5 align-middle ${headerBorderColor}`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(element) => { if (element) element.indeterminate = someSelected; }}
                  onChange={(event) => onSelectAll?.(event.target.checked)}
                  aria-label="Sélectionner tous"
                  className="h-[14px] w-[14px] cursor-pointer rounded accent-brand-500"
                />
              </th>
              <th scope="col" className={`w-[180px] border-b px-1.5 py-2.5 align-middle ${headerBorderColor}`}>Employé</th>
              <th scope="col" className={`w-[110px] border-b px-1.5 py-2.5 align-middle ${headerBorderColor}`}>Date paiement</th>
              <th scope="col" className={`w-[120px] border-b px-1.5 py-2.5 align-middle ${headerBorderColor}`}>Montant</th>
              <th scope="col" className={`w-[110px] border-b px-1.5 py-2.5 align-middle ${headerBorderColor}`}>Avance</th>
              <th scope="col" className={`w-[110px] border-b px-1.5 py-2.5 align-middle ${headerBorderColor}`}>Mode</th>
              <th scope="col" className={`w-[110px] border-b px-1.5 py-2.5 align-middle ${headerBorderColor}`}>Statut</th>
              <th scope="col" className={`w-[100px] border-b px-1.5 py-2.5 text-right align-middle ${headerBorderColor}`}>Actions</th>
            </tr>
          </thead>
          <tbody className={tableBackground}>
            {safePaiements.map((paiement, index) => {
              const isSelected = safeSelectedIds.has(paiement.id);
              const montant = safeNumber(paiement.montant);
              const avance = safeNumber(paiement.avance);
              const employeeName = getEmployeeName(paiement);
              const mode = paiement.mode_paiement || 'Non spécifié';
              const statut = paiement.statut || 'Payé';
              const isFirstRow = index === 0;
              const firstRowShadow = isFirstRow
                ? 'shadow-[inset_0_1px_0_0_rgba(107,114,128,0.5)] dark:shadow-[inset_0_1px_0_0_rgba(107,114,128,0.3)]'
                : '';

              const modeColor = mode === 'Espèces'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                : mode === 'Chèque'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/[0.05] dark:text-slate-300 dark:border-white/[0.12]';

              return (
                <tr
                  key={paiement.id}
                  onClick={() => { setOpenMenuId(null); if (onViewHistorique) onViewHistorique(paiement.employe_id); }}
                  className={`group h-[58px] cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? (isDark ? 'bg-brand-500/[0.08]' : 'bg-brand-50')
                      : (isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-slate-50')
                  } ${firstRowShadow}`}
                >
                  <td className={`border-b px-1.5 py-2 align-middle ${cellBorderColor}`} onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => onSelectOne?.(paiement.id, event.target.checked)}
                      aria-label={`Sélectionner ${paiement.id}`}
                      className="h-[14px] w-[14px] cursor-pointer rounded accent-brand-500"
                    />
                  </td>

                  <td className={`border-b px-1.5 py-2 align-middle ${cellBorderColor}`}>
                    <div
                      title={employeeName}
                      className="max-w-[160px] truncate text-[14px] font-semibold text-slate-900 transition-colors group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400"
                    >
                      {employeeName}
                    </div>
                  </td>

                  <td className={`border-b px-1.5 py-2 align-middle ${cellBorderColor}`}>
                    <span className="whitespace-nowrap text-[13px] font-medium text-slate-700 dark:text-slate-200">
                      {formatDate(paiement.date_paiement)}
                    </span>
                  </td>

                  <td className={`border-b px-1.5 py-2 align-middle ${cellBorderColor}`}>
                    <span className="whitespace-nowrap text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                      {`${Number(montant).toLocaleString('fr-FR')} Ar`}
                    </span>
                  </td>

                  <td className={`border-b px-1.5 py-2 align-middle ${cellBorderColor}`}>
                    {avance > 0 ? (
                      <span className="whitespace-nowrap text-[14px] font-semibold text-amber-600 dark:text-amber-400">
                        {`${Number(avance).toLocaleString('fr-FR')} Ar`}
                      </span>
                    ) : (
                      <span className="text-[14px] text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>

                  <td className={`border-b px-1.5 py-2 align-middle ${cellBorderColor}`}>
                    <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[12.5px] font-semibold leading-tight ${modeColor}`}>
                      {mode}
                    </span>
                  </td>

                  <td className={`border-b px-1.5 py-2 align-middle ${cellBorderColor}`}>
                    <StatusBadge status={statut} />
                  </td>

                  <td className={`border-b px-1 py-2 text-right align-middle ${cellBorderColor}`} onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {statut === 'Brouillon' && onValidate && (
                        <button
                          type="button"
                          title="Valider"
                          onClick={(event) => { event.preventDefault(); event.stopPropagation(); onValidate(paiement); }}
                          className="rounded-md p-1 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {onBulletin && (
                        <button
                          type="button"
                          title="Bulletin"
                          onClick={(event) => { event.preventDefault(); event.stopPropagation(); onBulletin(paiement); }}
                          className="rounded-md p-1 text-slate-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10"
                        >
                          <FileText size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Actions"
                        aria-label={`Actions pour ${employeeName}`}
                        aria-expanded={openMenuId === paiement.id}
                        onClick={(event) => toggleMenu(paiement.id, event)}
                        className={`flex h-7 w-7 items-center justify-center rounded border transition-all duration-150 ${
                          openMenuId === paiement.id
                            ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-500/10 dark:border-brand-500/20 dark:text-brand-400'
                            : 'border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-200 hover:text-brand-600 dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-white/[0.18] dark:hover:bg-white/[0.10] dark:hover:text-slate-100'
                        }`}
                      >
                        <span className="text-[14px] font-bold tracking-widest">...</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openMenuId !== null && currentPaiement && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[99999] w-[230px] overflow-hidden rounded-xl border-[0.5px] py-1.5 shadow-[0_18px_55px_rgba(15,23,42,0.35)] ${isDark ? 'border-white/[0.10] bg-[#0F172A]' : 'border-slate-200 bg-white'}`}
          style={{
            top: menuPosition.top !== undefined ? `${menuPosition.top}px` : undefined,
            bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : undefined,
            left: menuPosition.left !== undefined ? `${menuPosition.left}px` : undefined,
            right: menuPosition.right !== undefined ? `${menuPosition.right}px` : undefined,
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`border-b px-3 py-2.5 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
            <div className="min-w-0">
              <div className="max-w-[160px] truncate text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                {getEmployeeName(currentPaiement)}
              </div>
              <div className="mt-0.5 font-mono text-[12px] text-slate-400">ID #{currentPaiement.id}</div>
            </div>
          </div>

          <div className="flex flex-col text-[14px] py-0.5">
            {onViewHistorique && (
              <MenuButton
                icon={<History size={15} strokeWidth={2.2} />}
                label="Voir l'historique"
                tone="sky"
                onMouseDown={(event) => handleMenuAction(() => onViewHistorique(currentPaiement.employe_id), event)}
              />
            )}

            <MenuButton
              icon={<Edit size={15} strokeWidth={2.2} />}
              label="Modifier"
              tone="amber"
              onMouseDown={(event) => handleMenuAction(() => onEdit(currentPaiement), event)}
            />

            <div className={`mx-2 my-1 border-t ${isDark ? 'border-white/[0.07]' : 'border-slate-200'}`} />

            <MenuButton
              icon={<Trash2 size={15} strokeWidth={2.2} />}
              label="Supprimer"
              tone="danger"
              onMouseDown={(event) => handleMenuAction(() => onDelete(currentPaiement.id), event)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* ⭐⭐⭐ FOOTER ⭐⭐⭐ */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2 ${tableSecondaryBackground} ${borderColor}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          <span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.total}</span> paiement{stats.total > 1 ? 's' : ''}
          </span>

          {stats.nbPayes > 0 && (
            <span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {Number(stats.totalPaye).toLocaleString('fr-FR')} Ar
              </span>{' '}
              <span className="text-emerald-600 dark:text-emerald-400">Payé</span>{' '}
              <span className="text-[12px] text-slate-400">({stats.nbPayes})</span>
            </span>
          )}

          {stats.totalAvance > 0 && (
            <span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {Number(stats.totalAvance).toLocaleString('fr-FR')} Ar
              </span>{' '}
              Avance
            </span>
          )}

          {stats.nbEnAttente > 0 && (
            <span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {Number(stats.totalEnAttente).toLocaleString('fr-FR')} Ar
              </span>{' '}
              <span className="text-red-600 dark:text-red-400">En attente</span>{' '}
              <span className="text-[12px] text-slate-400">({stats.nbEnAttente})</span>
            </span>
          )}

          <span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{stats.employesUniques}</span> employé{stats.employesUniques > 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[12.5px] font-medium text-slate-400 dark:text-slate-500">Gestion des paiements</span>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 7px; height: 7px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4F46E5; border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4338CA; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #4F46E5 transparent; }
        .scrollbar-gutter-stable { scrollbar-gutter: stable; }
        @keyframes rowIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
        .group { animation: rowIn 0.16s ease-out; }
      `}</style>
    </div>
  );
};

export default PaiementsTable;