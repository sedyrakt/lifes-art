// src/pages/Commandes.tsx
// ⭐ FIX: Nalefa any amin'ny route vaovao ny "Echeances Depassees" (nesorina ny modal)
// ⭐ FIX: Nampiana useSearchParams hitantana ny `?view=ID` avy amin'ny pejy vaovao

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // ⭐ NAMPIANA
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCommandesData, ExportPeriod } from '../hooks/useCommandesData';
import { useCompany } from '../contexts/CompanyContext';
import CommandesHeader, { StatsPeriod } from '../components/commandes/CommandesHeader';
import { CommandesStats } from '../components/commandes';
import CommandesTable from '../components/commandes/CommandesTable';
import CommandesPagination from '../components/commandes/CommandesPagination';
import CommandesModalForm from '../components/commandes/CommandesModalForm';
import { CommandesDetailsModal } from '../components/commandes';
import ConfirmModal from '../components/common/ConfirmModal';
import SuccessModal from '../components/common/SuccessModal';
import ErrorModal from '../components/common/ErrorModal';
import CommandesSearchBar from '../components/commandes/CommandesSearchBar';
import CompanySettingsModal from '../components/company/CompanySettingsModal';

import {
  normalizePaiementStatus,
  countTotalItems,
  OverdueBanner,
  useCommandesPageModals,
} from './commandes/index';

interface EditingCommande {
  id: number;
  client_id: number | null;
  client_nom: string;
  mode_paiement: string;
  modalite_paiement: string;
  frais_livraison: number;
  montant_paye: number;
  total_ttc: number;
  statut_paiement: string;
}

const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  ce_mois: 'Ce mois',
  mois_dernier: 'Mois dernier',
  cette_annee: 'Cette année',
  tout: 'Tout',
};

const getStatsDateRange = (period: StatsPeriod): { startDate?: string; endDate?: string } => {
  const now = new Date();
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (period === 'ce_mois') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: `${fmt(start)} 00:00:00`, endDate: `${fmt(end)} 23:59:59` };
  }
  if (period === 'mois_dernier') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: `${fmt(start)} 00:00:00`, endDate: `${fmt(end)} 23:59:59` };
  }
  if (period === 'cette_annee') {
    return { startDate: `${now.getFullYear()}-01-01 00:00:00`, endDate: `${now.getFullYear()}-12-31 23:59:59` };
  }
  return { startDate: undefined, endDate: undefined };
};

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md ${className}`} />
);

const CommandesPageSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const cardBg = isDark ? 'bg-white/[0.04]' : 'bg-slate-100';
  const surfaceBg = isDark ? 'bg-[#0F172A]' : 'bg-white';
  const borderColor = isDark ? 'border-white/[0.10]' : 'border-slate-200';
  const rowBorderColor = isDark ? 'border-white/[0.06]' : 'border-slate-100';
  const pageBg = isDark ? '#0F172A' : '#EEF2FF';

  return (
    <main className="min-h-full w-full transition-colors duration-300" style={{ background: pageBg }}>
      <div className="mx-auto w-full max-w-[1600px] space-y-2 px-2 py-4 sm:px-3 lg:px-5">
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-[0.5px] p-4 ${surfaceBg} ${borderColor}`}>
          <div className="flex items-center gap-3">
            <SkeletonBlock className={`h-10 w-10 rounded-lg ${cardBg}`} />
            <div className="space-y-2">
              <SkeletonBlock className={`h-4 w-40 ${cardBg}`} />
              <SkeletonBlock className={`h-3 w-56 ${cardBg}`} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`rounded-xl border-[0.5px] p-4 ${surfaceBg} ${borderColor}`}>
              <SkeletonBlock className={`h-6 w-24 ${cardBg}`} />
            </div>
          ))}
        </div>
        <section className={`relative overflow-hidden rounded-2xl border-[0.5px] ${surfaceBg} ${borderColor}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-3 border-b px-3 py-3 ${rowBorderColor}`}>
              <SkeletonBlock className={`h-3.5 w-32 ${cardBg}`} />
              <SkeletonBlock className={`h-3.5 w-20 ${cardBg}`} />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

const Commandes: React.FC = () => {
  const { isDark } = useTheme();
  const { company } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate(); // ⭐ NOUVEAU
  const [searchParams, setSearchParams] = useSearchParams(); // ⭐ NOUVEAU

  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('tout');
  const statsDateRange = useMemo(() => getStatsDateRange(statsPeriod), [statsPeriod]);

  const {
    commandes, clients, produits, loading, refreshing, totalItems, totalPages,
    currentPage, setCurrentPage, searchTerm, setSearchTerm, filterStatut, setFilterStatut,
    sortOption, setSortOption,
    stats,
    globalStats,
    createCommande, deleteCommande,
    selectedClientId, setSelectedClientId, selectedProduits, setSelectedProduits,
    handleAddProduit, handleUpdateQuantite, handleRemoveProduit, clearPanier,
    refreshReferences, details, loadDetails, updatePaiement, getDetteStats, detteStats,
    exportPeriod, setExportPeriod, exportCustomDate, setExportCustomDate,
    exportToExcel, exportToPDF, exportToCSV,
    overdueCommandes,
    overdueCount,
    overdueTotal,
    loadGlobalStats,
    loadCommandes,
    filterDate, setFilterDate,
    filterMontantMin, filterMontantMax, filterModePaiement,
    periodStartDate, setPeriodStartDate,
    periodEndDate, setPeriodEndDate,
  } = useCommandesData({
    dateFrom: statsDateRange.startDate,
    dateTo: statsDateRange.endDate,
  });

  const {
    showModal, setShowModal,
    showViewModal,
    selectedCommande,
    deleteTarget,
    showDeleteModal,
    showSuccessModal,
    successTitle, successMessage,
    showErrorModal,
    errorTitle, errorMessage,
    selectedIds, setSelectedIds,
    showCompanyModal,
    commandeForInvoice,
    generatingPDF, setGeneratingPDF,
    montantPayeModal, setMontantPayeModal,
    showBulkDeleteModal,
    bulkDeleteTargetIds,
    showSuccess, showError,
    handleSelectAll, handleSelectOne,
    openDeleteModal, closeDeleteModal,
    openBulkDeleteModal, closeBulkDeleteModal,
    openViewModal, closeViewModal,
    openCompanyModal, closeCompanyModal,
    closeSuccessModal, closeErrorModal,
    // ⭐ NESORINA: showOverdueModal, openOverdueModal, closeOverdueModal
  } = useCommandesPageModals();

  const [editingCommande, setEditingCommande] = useState<EditingCommande | null>(null);

  const [periodStats, setPeriodStats] = useState({
    total: 0,
    totalCA: 0,
    totalPaye: 0,
    totalItems: 0,
    totalDette: 0,
    nbCommandesNonPayees: 0,
    nbCommandesPayees: 0,
    nbCommandesPartielles: 0,
    nbCommandesEnRetard: 0,
  });
  const [periodStatsLoaded, setPeriodStatsLoaded] = useState(false);

  const [debouncedSearchForStats, setDebouncedSearchForStats] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchForStats(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const fetchPeriodStats = useCallback(async (period: StatsPeriod) => {
    try {
      if (!window.api?.orders?.getStats) return;
      const dateRange = getStatsDateRange(period);

      const result = await window.api.orders.getStats({
        ...dateRange,
        search: debouncedSearchForStats || undefined,
        statut: filterStatut && filterStatut !== 'Tous' ? filterStatut : undefined,
        montantMin: filterMontantMin || undefined,
        montantMax: filterMontantMax || undefined,
        modePaiement: filterModePaiement || undefined,
      });

      if (result?.success) {
        const data = result.data || {};
        setPeriodStats({
          total: Number(data.total ?? 0),
          totalCA: Number(data.totalCA ?? data.total_ca ?? 0),
          totalPaye: Number(data.totalPaye ?? data.total_paye ?? 0),
          totalItems: Number(data.totalItems ?? 0),
          totalDette: Number(data.totalDette ?? data.total_dette ?? 0),
          nbCommandesNonPayees: Number(data.nbCommandesNonPayees ?? data.nb_commandes_non_payees ?? 0),
          nbCommandesPayees: Number(data.nbCommandesPayees ?? data.nb_commandes_payees ?? 0),
          nbCommandesPartielles: Number(data.nbCommandesPartielles ?? data.nb_commandes_partielle ?? 0),
          nbCommandesEnRetard: Number(data.nbCommandesEnRetard ?? data.nb_commandes_en_retard ?? 0),
        });
        setPeriodStatsLoaded(true);
      }
    } catch (err: any) {
      console.error('❌ fetchPeriodStats:', err?.message || err);
    }
  }, [debouncedSearchForStats, filterStatut, filterMontantMin, filterMontantMax, filterModePaiement]);

  useEffect(() => {
    fetchPeriodStats(statsPeriod);
  }, [statsPeriod, fetchPeriodStats]);

  // ⭐ NESORINA: Ilay useEffect auto-open modal (hasAutoOpenedOverdueRef)

  // ═══════════════════════════════════════════════════════════════
  // ⭐ HELPER: Mamaky commande vaovao avy amin'ny backend
  // ═══════════════════════════════════════════════════════════════
  const reloadCommande = useCallback(async (id: number) => {
    try {
      if (!window.api?.orders?.getById) return null;
      const res = await window.api.orders.getById(id);
      if (res?.success && res.data) {
        return {
          ...res.data,
          numero: `CMD-${String(res.data.id).padStart(6, '0')}`,
          statut_paiement: normalizePaiementStatus(res.data.statut_paiement),
        };
      }
    } catch (err) {
      console.warn('reloadCommande:', err);
    }
    return null;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ⭐ HANDLER: "Modifier" — refresh references + details
  // ═══════════════════════════════════════════════════════════════
  const handleEditCommande = useCallback(async (commande: any) => {
    try {
      await refreshReferences();
      const detailsList = await loadDetails(commande.id);

      const mappedProducts = (detailsList || [])
        .map((d: any) => ({
          id: Number(d.produit_id || d.produitId || 0),
          quantite: Number(d.quantite || d.quantity || 0),
          tva_rate: (d.tva_rate !== undefined && d.tva_rate !== null && d.tva_rate !== '')
            ? Number(d.tva_rate) : undefined,
        }))
        .filter((p: any) => p.id > 0 && p.quantite > 0);

      if (typeof setSelectedProduits === 'function') {
        setSelectedProduits(mappedProducts);
      } else {
        clearPanier();
        for (const p of mappedProducts) {
          handleAddProduit(p.id, p.quantite, p.tva_rate);
        }
      }

      let clientId = Number(commande.client_id);
      if (!Number.isFinite(clientId) || clientId <= 0) {
        const foundByName = (clients || []).find(
          (c: any) => String(c.nom || '').trim().toLowerCase() === String(commande.client_nom || '').trim().toLowerCase()
        );
        clientId = foundByName ? Number(foundByName.id) : 0;
      }
      setSelectedClientId(clientId > 0 ? clientId : null);
      setMontantPayeModal(Number(commande.montant_paye || 0));

      setEditingCommande({
        id: Number(commande.id),
        client_id: clientId > 0 ? clientId : null,
        client_nom: commande.client_nom || '',
        mode_paiement: commande.mode_paiement || 'Espèces',
        modalite_paiement: commande.modalite_paiement || 'Immediat',
        frais_livraison: Number(commande.frais_livraison || 0),
        montant_paye: Number(commande.montant_paye || 0),
        total_ttc: Number(commande.total_ttc || 0),
        statut_paiement: commande.statut_paiement || 'Non payé',
      });

      setShowModal(true);
    } catch (error: any) {
      console.error('[Commandes] handleEditCommande:', error);
      showError('Erreur', error?.message || 'Impossible de charger les détails pour modification.');
    }
  }, [
    refreshReferences, loadDetails, setSelectedProduits, setSelectedClientId,
    setMontantPayeModal, setEditingCommande, setShowModal,
    clearPanier, handleAddProduit, clients, showError,
  ]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!bulkDeleteTargetIds.length) return;
    const count = bulkDeleteTargetIds.length;
    try {
      for (const id of bulkDeleteTargetIds) await deleteCommande(id);
      showSuccess('Suppression en lot', `${count} commande(s) supprimée(s).`);
      setSelectedIds(new Set());
      closeBulkDeleteModal();
      await getDetteStats();
      await fetchPeriodStats(statsPeriod);
    } catch (error: any) {
      showError('Erreur', error?.message || 'Impossible de supprimer les commandes.');
    } finally {
      closeBulkDeleteModal();
    }
  }, [bulkDeleteTargetIds, deleteCommande, showSuccess, showError, getDetteStats, setSelectedIds, closeBulkDeleteModal, fetchPeriodStats, statsPeriod]);

  // ═══════════════════════════════════════════════════════════════
  // ⭐⭐⭐ HANDLER PRINCIPAL: "Marquer payée" / "Payée" ⭐⭐⭐
  // ═══════════════════════════════════════════════════════════════
  const handleMarkAsPaid = useCallback(async (
    id: number,
    data: { montant_paye: number; statut_paiement: string }
  ) => {
    try {
      const payload: { montant_paye: number; statut_paiement: string } = { ...data };

      if (
        (payload.statut_paiement === 'Payé' || payload.statut_paiement === 'Paye') &&
        (!payload.montant_paye || Number(payload.montant_paye) <= 0)
      ) {
        const target =
          commandes.find((c: any) => Number(c.id) === Number(id)) ||
          (selectedCommande && Number(selectedCommande.id) === Number(id) ? selectedCommande : null);

        if (target) {
          payload.montant_paye = Number(target.total_ttc || 0);
        }
      }

      await updatePaiement(id, payload);
      showSuccess('Paiement validé', 'Statut de paiement mis à jour.');

      await getDetteStats();
      await fetchPeriodStats(statsPeriod);

      if (showViewModal && selectedCommande && Number(selectedCommande.id) === Number(id)) {
        const updated = await reloadCommande(id);
        if (updated) {
          await loadDetails(id);
          openViewModal(updated);
        }
      }
    } catch (error: any) {
      showError('Erreur', error?.message || 'Erreur paiement');
    }
  }, [
    updatePaiement, getDetteStats, showSuccess, showError,
    fetchPeriodStats, statsPeriod, commandes, selectedCommande,
    showViewModal, openViewModal, loadDetails, reloadCommande,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteCommande(deleteTarget.id);
      showSuccess('Commande supprimée', `"${deleteTarget.numero || `CMD-${deleteTarget.id}`}" supprimée.`);
      await getDetteStats();
      await fetchPeriodStats(statsPeriod);
    } catch (error: any) {
      showError('Erreur', error?.message || 'Erreur suppression');
    } finally {
      closeDeleteModal();
    }
  }, [deleteTarget, deleteCommande, showSuccess, showError, getDetteStats, closeDeleteModal, fetchPeriodStats, statsPeriod]);

  const handleViewCommande = useCallback(async (commande: any) => {
    openViewModal(commande);
    await loadDetails(commande.id);
  }, [openViewModal, loadDetails]);

  // ⭐ NOUVEAU: TANTANA NY ?view=ID (Rehefa avy mikitika "Voir" ao amin'ny pejy EcheancesDepassees)
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && commandes.length > 0 && !loading) {
      const cmd = commandes.find((c: any) => Number(c.id) === Number(viewId));
      if (cmd) {
        handleViewCommande(cmd);
        // Diovina ny paramètre mba tsy hiverina indray rehefa refresh
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, commandes, loading, handleViewCommande, setSearchParams]);

  const handleOpenAddModal = useCallback(async () => {
    try {
      setEditingCommande(null);
      await refreshReferences();
      setMontantPayeModal(0);
      setShowModal(true);
    } catch (error: any) {
      showError('Erreur', error?.message || 'Impossible de charger.');
    }
  }, [refreshReferences, showError, setMontantPayeModal, setShowModal]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    clearPanier();
    setSelectedClientId(null);
    setMontantPayeModal(0);
    setEditingCommande(null);
  }, [clearPanier, setSelectedClientId, setShowModal, setMontantPayeModal]);

  const handleSubmitCommande = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClientId) { showError('Client requis', 'Sélectionnez un client.'); return; }
    if (!selectedProduits.length) { showError('Panier vide', 'Ajoutez au moins un produit.'); return; }
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const montantPaye = Math.max(0, Number(montantPayeModal || 0));
      const modePaiement = (formData.get('mode_paiement') as string) || 'Espèces';
      const modalitePaiement = (formData.get('modalite_paiement') as string) || 'Immediat';
      const fraisLivraison = Number(formData.get('frais_livraison') || 0);

      const client = clients.find((c: any) => c.id === selectedClientId);
      if (!client) { showError('Erreur', 'Client introuvable.'); return; }

      let totalHT = 0;
      let totalTVA = 0;
      const productDetails = selectedProduits.map((item: any) => {
        const product = produits.find((p: any) => p.id === item.id);
        if (!product) return null;
        const qty = Number(item.quantite);
        const price = Number(product.prix_vente || 0);
        const lineTotal = qty * price;
        totalHT += lineTotal;
        const rate = (product.tva_rate !== undefined && product.tva_rate !== null && product.tva_rate !== '')
          ? Number(product.tva_rate) : 0;
        totalTVA += lineTotal * rate;
        return { id: product.id, name: product.nom, price, quantity: qty, tva_rate: rate };
      }).filter(Boolean);

      const totalHTFinal = totalHT + fraisLivraison;
      const totalTTC = totalHTFinal + totalTVA;
      const montantPayeSafe = Math.max(0, Math.min(totalTTC, montantPaye));
      const statutPaiement = montantPayeSafe <= 0
        ? 'Non payé'
        : montantPayeSafe >= totalTTC ? 'Payé' : 'Partiel';
      const montantRestant = Math.max(0, totalTTC - montantPayeSafe);

      const payload = {
        client_id: client.id,
        client_nom: client.nom,
        products: productDetails,
        total_ht: totalHTFinal,
        total_ttc: totalTTC,
        statut_paiement: statutPaiement,
        montant_paye: montantPayeSafe,
        montant_restant: montantRestant,
        mode_paiement: modePaiement,
        modalite_paiement: modalitePaiement,
        frais_livraison: fraisLivraison,
      };

      if (editingCommande) {
        if (!window.api?.orders?.update) throw new Error('API orders.update indisponible');
        const result = await window.api.orders.update(editingCommande.id, payload);
        if (!result?.success) throw new Error(result?.error || 'Erreur mise à jour commande');
        showSuccess('Commande modifiée', `"CMD-${String(editingCommande.id).padStart(6, '0')}" mise à jour.`);

        if (showViewModal && selectedCommande && Number(selectedCommande.id) === Number(editingCommande.id)) {
          const updated = await reloadCommande(editingCommande.id);
          if (updated) {
            await loadDetails(editingCommande.id);
            openViewModal(updated);
          }
        }
      } else {
        await createCommande(selectedClientId, selectedProduits, {
          montant_paye: montantPayeSafe,
          mode_paiement: modePaiement,
          modalite_paiement: modalitePaiement,
          frais_livraison: fraisLivraison,
        });
        showSuccess('Commande créée', 'Commande enregistrée.');
      }

      setShowModal(false);
      clearPanier();
      setSelectedClientId(null);
      setMontantPayeModal(0);
      setEditingCommande(null);

      await getDetteStats();
      await fetchPeriodStats(statsPeriod);
      if (typeof loadCommandes === 'function') {
        await loadCommandes(true);
      }
    } catch (error: any) {
      showError('Erreur', error?.message || 'Erreur lors de l\'enregistrement.');
    }
  }, [
    selectedClientId, selectedProduits, montantPayeModal,
    editingCommande, clients, produits,
    createCommande, clearPanier, setSelectedClientId,
    showSuccess, showError, getDetteStats, setShowModal,
    setMontantPayeModal, fetchPeriodStats,
    statsPeriod, loadCommandes,
    showViewModal, selectedCommande, openViewModal, loadDetails, reloadCommande,
  ]);

  const handleGenerateInvoiceClick = useCallback(async (commande: any) => {
    try {
      const products = await loadDetails(commande.id);
      const fraisLivraison = Number(commande.frais_livraison || 0);
      openCompanyModal({
        ...commande,
        statut_paiement: normalizePaiementStatus(commande?.statut_paiement),
        products: products || [],
        livraison: fraisLivraison > 0 ? 'Oui' : 'Non',
        frais_livraison: fraisLivraison,
      });
    } catch (error: any) {
      showError('Erreur', `Impossible de charger les produits : ${error?.message || 'Erreur inconnue'}`);
    }
  }, [loadDetails, showError, openCompanyModal]);

  const handleCompanyModalGenerate = useCallback(async (dataFromModal?: any) => {
    if (!commandeForInvoice) return;
    setGeneratingPDF(true);
    try {
      const companyData: any = dataFromModal || company || {};
      const { downloadPDF } = await import('../lib/pdfService');
      const displayVendeur = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : (user?.name || 'admin');

      const fraisLivraison = Number(commandeForInvoice.frais_livraison || 0);
      const livraisonDisplay = commandeForInvoice.livraison || (fraisLivraison > 0 ? 'Oui' : 'Non');

      const result = await downloadPDF({
        order: commandeForInvoice,
        clientName: commandeForInvoice.client_nom || 'Client',
        clientEmail: commandeForInvoice.client_email || '',
        clientPhone: commandeForInvoice.client_telephone || '',
        clientAddress: commandeForInvoice.client_address || '',
        clientNif: companyData?.clientNif || '',
        clientStat: companyData?.clientStat || '',
        clientRcs: companyData?.clientRcs || '',
        clientCif: companyData?.clientCif || '',
        clientContact: companyData?.clientContact || commandeForInvoice.client_telephone || '',
        companyName: companyData?.name || "LIFE'S ART",
        companyAddress: companyData?.address || '',
        companyPhone: companyData?.phone || '',
        companyEmail: companyData?.email || '',
        companyWebsite: companyData?.website || '',
        companyStat: companyData?.stat || companyData?.siret || '',
        companyNif: companyData?.nif || companyData?.taxId || '',
        companyRcs: companyData?.rcs || '',
        companyVatNumber: companyData?.vatNumber || '',
        paymentMethod: commandeForInvoice.mode_paiement || 'Espèces',
        paymentTerms: commandeForInvoice.modalite_paiement || 'Immediat',
        dueDate: commandeForInvoice.date_limite_paiement,
        montantPaye: commandeForInvoice.montant_paye || 0,
        vendeur: displayVendeur,
        isPro: true,
        livraison: livraisonDisplay,
      }, isDark);

      if (result?.canceled) showSuccess('Génération annulée', 'PDF annulé.');
      else if (result?.success) showSuccess('Facture générée', 'Facture enregistrée.');
      else showError('Erreur', result?.error || 'Erreur génération.');
      return result;
    } catch (error: any) {
      showError('Erreur', error?.message || 'Erreur génération.');
      return { success: false, error: error?.message };
    } finally {
      setGeneratingPDF(false);
      closeCompanyModal();
    }
  }, [commandeForInvoice, company, showSuccess, showError, user, isDark, setGeneratingPDF, closeCompanyModal]);

  const filteredCommandes = commandes;

  const hasFilter = useMemo(() => Boolean(
    filterDate || searchTerm || (filterStatut && filterStatut !== 'Tous') ||
    (statsPeriod && statsPeriod !== 'tout')
  ), [filterDate, searchTerm, filterStatut, statsPeriod]);

  const filteredStats = useMemo(() => {
    if (hasFilter) {
      return {
        total: Number(totalItems) || Number(periodStats.total) || 0,
        totalCA: Number(periodStats.totalCA) || 0,
        totalPaye: Number(periodStats.totalPaye) || 0,
        totalItems: Number(periodStats.totalItems) || 0,
        totalDette: Number(periodStats.totalDette) || 0,
        nbCommandesNonPayees: Number(periodStats.nbCommandesNonPayees) || 0,
        nbCommandesPayees: Number(periodStats.nbCommandesPayees) || 0,
        nbCommandesPartielles: Number(periodStats.nbCommandesPartielles) || 0,
        nbCommandesEnRetard: Number(periodStats.nbCommandesEnRetard) || 0,
      };
    }

    return {
      total: globalStats.total || totalItems,
      totalCA: globalStats.totalCA,
      totalPaye: globalStats.totalPaye,
      totalItems: globalStats.totalItems,
      totalDette: globalStats.totalDette,
      nbCommandesNonPayees: detteStats?.nb_commandes_non_payees || globalStats.nbCommandesNonPayees,
      nbCommandesPayees: globalStats.nbCommandesPayees,
      nbCommandesPartielles: globalStats.nbCommandesPartielles,
      nbCommandesEnRetard: globalStats.nbCommandesEnRetard,
    };
  }, [hasFilter, totalItems, periodStats, globalStats, detteStats]);

  const displayedStats = periodStats;

  if (loading && commandes.length === 0) {
    return <CommandesPageSkeleton isDark={isDark} />;
  }

  return (
    <main className="min-h-full w-full transition-colors duration-300"
      style={{ background: isDark ? '#0F172A' : '#EEF2FF' }}>
      <div className="mx-auto w-full max-w-[1600px] space-y-2 px-2 py-4 sm:px-3 lg:px-5">
           <CommandesHeader
          onAddCommande={handleOpenAddModal}
          onOpenStats={() => {}}
          onOpenEcheances={() => navigate('/echeances-depassees')} 
          totalItems={displayedStats.total}
          refreshing={refreshing}
          statsPeriod={statsPeriod}
          onStatsPeriodChange={setStatsPeriod}
        />
        <CommandesStats
          total={displayedStats.total}
          totalCA={displayedStats.totalCA}
          totalItems={displayedStats.totalItems}
          refreshing={refreshing}
          totalDette={displayedStats.totalDette}
          nbCommandesNonPayees={displayedStats.nbCommandesNonPayees}
          periodLabel={STATS_PERIOD_LABELS[statsPeriod]}
        />

        <CommandesSearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterStatut={filterStatut}
          onFilterStatutChange={setFilterStatut}
          sortOption={sortOption}
          onSortChange={setSortOption}
          isLoading={loading}
          filterDate={filterDate}
          onFilterDateChange={setFilterDate}
        />

        {/* ⭐ NOUVEAU: Mandeha makany amin'ny route vaovao ny onClick */}
        <OverdueBanner
          isDark={isDark}
          overdueCount={overdueCount}
          overdueTotal={overdueTotal}
          onClick={() => navigate('/echeances-depassees')} 
        />

        <section className="relative overflow-hidden rounded-2xl border transition-all duration-300"
          style={{
            background: isDark ? '#0F172A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            boxShadow: isDark
              ? '0 4px 24px -4px rgba(0,0,0,0.35)'
              : '0 4px 20px -4px rgba(79,70,229,0.08)',
          }}>
          {refreshing && (
            <div className="absolute left-0 right-0 top-0 z-20 h-[3px] overflow-hidden rounded-t-2xl bg-transparent">
              <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-brand-500" />
            </div>
          )}
          <CommandesTable
            commandes={filteredCommandes}
            onView={handleViewCommande}
            onDelete={openDeleteModal}
            onGenerateFacture={handleGenerateInvoiceClick}
            onEdit={handleEditCommande}
            selectedIds={selectedIds}
            onSelectAll={(checked) => handleSelectAll(checked, commandes)}
            onSelectOne={handleSelectOne}
            loading={loading}
            totalItems={filteredStats.total}
            generating={generatingPDF}
            onAdd={handleOpenAddModal}
            onUpdatePaiement={handleMarkAsPaid}
            onBulkDelete={openBulkDeleteModal}
            globalStats={filteredStats}
            hasActiveFilter={false}
          />
        </section>

        {!loading && filteredStats.total > 0 && (
          <div className="flex items-center justify-between rounded-2xl border px-3 py-2.5 transition-all duration-300"
            style={{
              background: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            }}>
            <CommandesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredStats.total}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <CommandesModalForm
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitCommande}
        clients={clients}
        produits={produits}
        selectedClientId={selectedClientId}
        onClientChange={setSelectedClientId}
        selectedProduits={selectedProduits}
        onAddProduit={handleAddProduit}
        onUpdateQuantite={handleUpdateQuantite}
        onRemoveProduit={handleRemoveProduit}
        onClearPanier={clearPanier}
        isDark={isDark}
        montantPaye={montantPayeModal}
        onMontantPayeChange={setMontantPayeModal}
        editingCommande={editingCommande}
      />

      {showViewModal && selectedCommande && (
        <CommandesDetailsModal
          commande={{
            ...selectedCommande,
            statut_paiement: normalizePaiementStatus(selectedCommande?.statut_paiement),
          }}
          details={details}
          onClose={closeViewModal}
          onGenerateFacture={() => handleGenerateInvoiceClick(selectedCommande)}
          onUpdatePaiement={handleMarkAsPaid}
          onEdit={handleEditCommande}
        />
      )}

      <CompanySettingsModal
        isOpen={showCompanyModal}
        onClose={closeCompanyModal}
        onSave={closeCompanyModal}
        onGenerate={handleCompanyModalGenerate}
        mode="generate"
        isDark={isDark}
        commandeForInvoice={commandeForInvoice}
        initialData={company}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Suppression"
        message={`Supprimer "${deleteTarget?.numero || ''}" ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmColor="red"
        isDark={isDark}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={closeBulkDeleteModal}
        onConfirm={handleConfirmBulkDelete}
        title="Suppression en lot"
        message={`Voulez-vous supprimer ${bulkDeleteTargetIds.length} commande(s) ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmColor="red"
        isDark={isDark}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={closeSuccessModal}
        title={successTitle}
        message={successMessage}
        buttonText="OK"
        autoCloseDelay={3000}
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={closeErrorModal}
        title={errorTitle}
        message={errorMessage}
        buttonText="OK"
        autoCloseDelay={4000}
      />

      {/* ⭐ NESORINA: <EcheancesDepasseesModal /> tsy ampiasaina intsony eto */}
    </main>
  );
};

export default Commandes;