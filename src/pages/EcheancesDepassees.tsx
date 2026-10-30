// src/pages/EcheancesDepassees.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Eye, Search, 
  AlertTriangle, DollarSign, Users, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useCommandesData } from '../hooks/useCommandesData';
import ConfirmModal from '../components/common/ConfirmModal';
import SuccessModal from '../components/common/SuccessModal';

interface OverdueCommande {
  id: number;
  numero?: string;
  client_nom?: string;
  client_telephone?: string;
  total_ttc?: number;
  montant_paye?: number;
  montant_restant?: number;
  date_commande?: string;
  date_limite_paiement?: string;
  modalite_paiement?: string;
  mode_paiement?: string;
  late_seconds?: number;
}

// ⭐ ITEMS_PER_PAGE natao 8
const ITEMS_PER_PAGE = 8;

const formatDateFR = (v?: string): string => {
  if (!v) return '—';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('fr-FR');
};

const formatDateTimeFR = (v?: string): string => {
  if (!v) return '—';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) {
    const [, y, mo, d, hh, mm] = m;
    return hh ? `${d}/${mo}/${y} · ${hh}:${mm}` : `${d}/${mo}/${y}`;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? s : dt.toLocaleString('fr-FR');
};

const formatMoney = (v: number | undefined): string => `${Number(v || 0).toLocaleString('fr-FR')} Ar`;

const formatLate = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'À l\'instant';
  if (seconds < 60) return 'À l\'instant';
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min de retard`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours} h de retard`;
  const days = Math.floor(totalHours / 24);
  const remH = totalHours % 24;
  return remH > 0 ? `${days} j ${remH} h de retard` : `${days} j de retard`;
};

const EcheancesDepassees: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const { overdueCommandes, overdueTotal, updatePaiement, getDetteStats, refreshing } = useCommandesData({});

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [confirmTarget, setConfirmTarget] = useState<OverdueCommande | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ⭐ Filtrage & Tri (recent first)
  const filteredCommandes = useMemo(() => {
    let result = [...overdueCommandes];
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.client_nom?.toLowerCase().includes(lowerSearch)) ||
        (c.numero?.toLowerCase().includes(lowerSearch)) ||
        (c.client_telephone?.includes(lowerSearch))
      );
    }

    // Tri par date_limite_paiement descendant (ny farany no voalohany)
    result.sort((a, b) => {
      const dateA = a.date_limite_paiement || '';
      const dateB = b.date_limite_paiement || '';
      return dateB.localeCompare(dateA);
    });

    return result;
  }, [overdueCommandes, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const totalCount = filteredCommandes.length;
    const totalDette = filteredCommandes.reduce((sum, c) => sum + Number(c.montant_restant || 0), 0);
    const uniqueClients = new Set(filteredCommandes.map(c => c.client_nom)).size;
    return { totalCount, totalDette, uniqueClients };
  }, [filteredCommandes]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCommandes.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCommandes = filteredCommandes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAskMarkAsPaid = (cmd: OverdueCommande) => {
    setConfirmTarget(cmd);
    setShowConfirm(true);
  };

  const handleConfirmMarkAsPaid = async () => {
    if (!confirmTarget) return;
    const totalTTC = Number(confirmTarget.total_ttc || 0);
    await updatePaiement(confirmTarget.id, { montant_paye: totalTTC, statut_paiement: 'Payé' });
    await getDetteStats();
    setShowConfirm(false);
    setConfirmTarget(null);
    setShowSuccess(true);
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | 'dots')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('dots');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('dots');
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Styles
  const borderColor = isDark ? 'border-white/[0.12]' : 'border-slate-300'; // ⭐ Natao slate-300
  const tableBorder = isDark ? '0.5px solid rgba(255,255,255,0.10)' : '0.5px solid #CBD5E1'; // ⭐ border-slate-300
  const headerBg = isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC';
  const rowBgEven = isDark ? 'rgba(255,255,255,0.01)' : '#FFFFFF';
  const rowBgOdd = isDark ? 'rgba(239,68,68,0.04)' : '#FEF8F8';
  const cellPadding = '12px 16px';

  const thStyle: React.CSSProperties = {
    border: tableBorder, padding: cellPadding, fontSize: 12.5, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    color: isDark ? '#94A3B8' : '#64748B', whiteSpace: 'nowrap',
  };

  return (
    <main className="min-h-full w-full transition-colors duration-300" style={{ background: isDark ? '#0F172A' : '#EEF2FF' }}>
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-2 py-4 sm:px-3 lg:px-5">
        
        {/* ⭐ HEADER PAGE (Mitovy amin'ny CommandesHeader) */}
        <header className="mb-4 w-full relative z-[100]">
          <div className={`group relative flex flex-col gap-3 overflow-visible rounded-xl border dark:border-[0.5px] shadow-sm transition-colors duration-200 md:flex-row md:items-center md:justify-between px-3 py-2 ${isDark ? 'bg-[#0F172A]' : 'bg-white'} ${borderColor}`}>
            
            {/* Bordure gauche indigo */}
            <div className="absolute left-0 top-0 h-full w-[2px] bg-brand-500" />

            {/* Titre, bouton retour, et sous-titre */}
            <div className="relative z-10 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => navigate('/commandes')}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:border-brand-500/50 hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${borderColor} ${isDark ? 'bg-[#0F172A] text-slate-400' : 'bg-white text-slate-500'}`}
                title="Retour aux commandes"
              >
                <ArrowLeft size={16} strokeWidth={2.2} />
              </button>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                    Échéances dépassées
                  </h1>
                </div>
                <p className="mt-0.5 text-[12.5px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                  Suivi des commandes en retard de paiement.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="relative z-10 flex w-full shrink-0 flex-wrap items-center gap-2 md:w-auto">
              <button
                onClick={() => getDetteStats()}
                disabled={refreshing}
                title="Actualiser"
                aria-label="Actualiser les échéances"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-slate-500 transition-colors hover:border-brand-500/50 hover:bg-brand-50 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 ${borderColor} ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}
              >
                <RefreshCw size={15} strokeWidth={2.2} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </header>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={`flex items-center gap-3 rounded-xl border dark:border-[0.5px] p-3 ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-300'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Commandes en retard</p>
              <p className="text-xl font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>{stats.totalCount}</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-xl border dark:border-[0.5px] p-3 ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-300'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Total à régler</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatMoney(stats.totalDette)}</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-xl border dark:border-[0.5px] p-3 ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-300'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Users size={18} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Clients concernés</p>
              <p className="text-xl font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>{stats.uniqueClients}</p>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className={`flex items-center gap-3 rounded-xl border dark:border-[0.5px] p-3 ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-300'}`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par client, téléphone ou n° commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${
                isDark 
                  ? 'border-white/10 bg-white/5 text-white placeholder-slate-400' 
                  : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        {/* TABLEAU */}
        <div className={`overflow-hidden rounded-xl border dark:border-[0.5px] ${isDark ? 'bg-[#0F172A] border-white/10' : 'bg-white border-slate-300'}`}>
          <div className="overflow-x-auto custom-scrollbar-thin">
            <table className="w-full min-w-[1000px] border-collapse text-left" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr style={{ background: headerBg }}>
                  <th style={{ ...thStyle, textAlign: 'left' }}>N° Commande</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Client</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Commande</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Échéance</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Retard</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Mode / Modalité</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total TTC</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Payé</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Reste</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCommandes.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
                        <p className="text-lg font-semibold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {searchTerm ? 'Aucun résultat trouvé' : 'Aucune commande en retard'}
                        </p>
                        <p className="text-sm mt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          {searchTerm ? 'Essayez de modifier votre recherche.' : 'Toutes les échéances sont respectées.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCommandes.map((cmd: OverdueCommande, index: number) => {
                    const totalTTC = Number(cmd.total_ttc || 0);
                    const paye = Number(cmd.montant_paye || 0);
                    const restant = Number(cmd.montant_restant || (totalTTC - paye));
                    const lateText = formatLate(Number(cmd.late_seconds || 0));
                    const rowBg = index % 2 === 0 ? rowBgEven : rowBgOdd;

                    return (
                      <tr key={cmd.id} style={{ background: rowBg }} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                        
                        <td style={{ border: tableBorder, padding: cellPadding, whiteSpace: 'nowrap' }}>
                          <span className="inline-flex items-center rounded-md px-2 py-1 font-mono text-sm font-bold whitespace-nowrap" style={{ background: isDark ? 'rgba(79,70,229,0.15)' : 'rgba(79,70,229,0.08)', color: isDark ? '#A5B4FC' : '#4F46E5' }}>
                            {cmd.numero || `CMD-${String(cmd.id).padStart(6, '0')}`}
                          </span>
                        </td>

                        <td style={{ border: tableBorder, padding: cellPadding, whiteSpace: 'nowrap' }}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-semibold whitespace-nowrap" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>{cmd.client_nom}</span>
                            {cmd.client_telephone && <span className="text-[13px] whitespace-nowrap" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{cmd.client_telephone}</span>}
                          </div>
                        </td>

                        <td style={{ border: tableBorder, padding: cellPadding, whiteSpace: 'nowrap' }}>
                          <span className="text-sm font-semibold" style={{ color: isDark ? '#E2E8F0' : '#334155' }}>{formatDateFR(cmd.date_commande)}</span>
                        </td>
                        <td style={{ border: tableBorder, padding: cellPadding, whiteSpace: 'nowrap' }}>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatDateTimeFR(cmd.date_limite_paiement)}</span>
                        </td>
                        <td style={{ border: tableBorder, padding: cellPadding }}>
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400 whitespace-nowrap">
                            {lateText}
                          </span>
                        </td>
                        <td style={{ border: tableBorder, padding: cellPadding }}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold" style={{ color: isDark ? '#E2E8F0' : '#334155' }}>{cmd.mode_paiement || 'Espèces'}</span>
                            <span className="text-xs" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>{cmd.modalite_paiement || 'Immediat'}</span>
                          </div>
                        </td>
                        <td style={{ border: tableBorder, padding: cellPadding, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span className="text-sm font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>{formatMoney(totalTTC)}</span>
                        </td>
                        <td style={{ border: tableBorder, padding: cellPadding, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(paye)}</span>
                        </td>
                        <td style={{ border: tableBorder, padding: cellPadding, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatMoney(restant)}</span>
                        </td>
                        <td style={{ border: tableBorder, padding: cellPadding, textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/commandes?view=${cmd.id}`)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                              style={{ color: isDark ? '#CBD5E1' : '#334155' }}
                              title="Voir détails"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleAskMarkAsPaid(cmd)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20"
                              style={{ borderColor: 'rgba(16,185,129,0.30)', background: 'rgba(16,185,129,0.08)', color: '#10B981' }}
                              title="Marquer payée"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {filteredCommandes.length > ITEMS_PER_PAGE && (
            <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
              <p className="text-sm" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Affichage de <strong>{startIndex + 1}</strong> à <strong>{Math.min(startIndex + ITEMS_PER_PAGE, filteredCommandes.length)}</strong> sur <strong>{filteredCommandes.length}</strong>
              </p>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition disabled:opacity-50 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  style={{ color: isDark ? '#CBD5E1' : '#334155' }}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {pageNumbers.map((p, i) => 
                  p === 'dots' ? (
                    <span key={`dots-${i}`} className="px-1 text-sm" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-semibold transition ${
                        p === currentPage ? 'border-brand-500 bg-brand-500 text-white' : 'hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'
                      }`}
                      style={p !== currentPage ? { color: isDark ? '#CBD5E1' : '#334155' } : {}}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition disabled:opacity-50 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  style={{ color: isDark ? '#CBD5E1' : '#334155' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setConfirmTarget(null); }}
        onConfirm={handleConfirmMarkAsPaid}
        title="Marquer comme payée ?"
        message={`Confirmez-vous avoir reçu le paiement de **${formatMoney(Number(confirmTarget?.total_ttc || 0))}** pour la commande **${confirmTarget?.numero || ''}** ?`}
        confirmText="Marquer payée"
        cancelText="Annuler"
        confirmColor="green"
        isDark={isDark}
      />

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Paiement validé"
        message="Le statut de la commande a été mis à jour avec succès."
        buttonText="OK"
        autoCloseDelay={3000}
      />

      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'};
          border-radius: 999px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'};
        }
        .custom-scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} transparent;
        }
      `}</style>
    </main>
  );
};

export default EcheancesDepassees;