// src/pages/Produits.tsx
// ⭐ HARD DELETE + esorina ny bulk-update-status sy statut filtre
// ⭐ VAOVAO: filtre Fournisseur + filtre Type + `type_produit` amin'ny handleSubmit
// ⭐ FIX LOGIQUE ERP STANDARD:
//    - Prix de vente : 'fini' IHANY (required)
//    - Prix d'achat  : required ho 'matiere_premiere'
//    - Fournisseur   : required ho 'matiere_premiere'
//    - Stock initial : ACCEPTÉ ho type rehetra (facultatif)
//    - Stock minimum : ACCEPTÉ ho type rehetra (facultatif)

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useProduitsData, ExportPeriod } from '../hooks/useProduitsData';

import ProduitsHeader from '../components/produits/ProduitsHeader';
import ProduitsStats from '../components/produits/ProduitsStats';
import ProduitsTable from '../components/produits/ProduitsTable';
import ProduitsPagination from '../components/produits/ProduitsPagination';
import ProduitsModalForm from '../components/produits/ProduitsModalForm';
import ProduitsViewModal from '../components/produits/ProduitsViewModal';
import CommandesModalForm from '../components/commandes/CommandesModalForm';
import ConfirmModal from '../components/common/ConfirmModal';
import SuccessModal from '../components/common/SuccessModal';
import ErrorModal from '../components/common/ErrorModal';
import ProduitsSearchBar from '../components/produits/ProduitsSearchBar';

import {
  getStockLevel,
  getStatusColor,
  getStatusIcon,
  useProduitsPageModals,
  useProduitsCommandeModal,
} from './produits/index';

// ============================================================
// SKELETON LOADER FULL-PAGE
// ============================================================

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md ${className}`} />
);

const ProduitsPageSkeleton: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const cardBg = isDark ? 'bg-white/[0.04]' : 'bg-slate-100';
  const surfaceBg = isDark ? 'bg-[#0F172A]' : 'bg-white';
  const borderColor = isDark ? 'border-white/[0.10]' : 'border-slate-200';
  const rowBorderColor = isDark ? 'border-white/[0.06]' : 'border-slate-100';
  const pageBg = isDark ? '#0F172A' : '#EEF2FF';

  return (
    <div className="min-h-screen w-full transition-colors duration-300" style={{ background: pageBg }}>
      <div className="mx-auto w-full max-w-[1600px] space-y-2 px-2 py-4 sm:px-3 lg:px-5">
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-[0.5px] p-4 ${surfaceBg} ${borderColor}`}>
          <div className="flex items-center gap-3">
            <SkeletonBlock className={`h-10 w-10 rounded-lg ${cardBg}`} />
            <div className="space-y-2">
              <SkeletonBlock className={`h-4 w-40 ${cardBg}`} />
              <SkeletonBlock className={`h-3 w-56 ${cardBg}`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className={`h-9 w-9 rounded-lg ${cardBg}`} />
            <SkeletonBlock className={`h-9 w-32 rounded-lg ${cardBg}`} />
            <SkeletonBlock className={`h-9 w-40 rounded-lg ${cardBg}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`rounded-xl border-[0.5px] p-4 ${surfaceBg} ${borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <SkeletonBlock className={`h-3 w-20 ${cardBg}`} />
                  <SkeletonBlock className={`h-6 w-28 ${cardBg}`} />
                </div>
                <SkeletonBlock className={`h-10 w-10 rounded-lg ${cardBg}`} />
              </div>
            </div>
          ))}
        </div>

        <section className={`relative overflow-hidden rounded-2xl border-[0.5px] ${surfaceBg} ${borderColor}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`flex items-center gap-3 border-b px-3 py-3 ${rowBorderColor}`}>
              <SkeletonBlock className={`h-4 w-4 rounded ${cardBg}`} />
              <SkeletonBlock className={`h-5 w-20 rounded ${cardBg}`} />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock className={`h-3.5 w-40 ${cardBg}`} />
                <SkeletonBlock className={`h-2.5 w-24 ${cardBg}`} />
              </div>
              <SkeletonBlock className={`h-3.5 w-20 ${cardBg}`} />
              <SkeletonBlock className={`h-7 w-7 rounded ${cardBg}`} />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

// ============================================================
// COMPOSANT
// ============================================================

const Produits: React.FC = () => {
  const { isDark } = useTheme();
  const {
    produits, categories, fournisseurs, loadReferences,
    loading, refreshing, totalItems, totalPages,
    currentPage, setCurrentPage, filters, setFilters,
    sortOption, setSortOption, generateCode,
    createProduit, updateProduit, deleteProduit, getProduitById,
    bulkDelete, getStats, loadData,
    exportPeriod, setExportPeriod, exportCustomDate, setExportCustomDate,
    exportToExcel, exportToPDF, exportToCSV,
  } = useProduitsData();

  const [reelStats, setReelStats] = useState({
    totalItems: 0,
    totalStock: 0,
    alertes: 0,
    totalValeur: 0,
    rupture: 0,
  });

  const [successTitleLocal, setSuccessTitleLocal] = useState('');
  const [successMessageLocal, setSuccessMessageLocal] = useState('');
  const [errorTitleLocal, setErrorTitleLocal] = useState('');
  const [errorMessageLocal, setErrorMessageLocal] = useState('');
  const [showSuccessModalLocal, setShowSuccessModalLocal] = useState(false);
  const [showErrorModalLocal, setShowErrorModalLocal] = useState(false);

  const showSuccess = useCallback((t: string, m: string) => {
    setSuccessTitleLocal(t);
    setSuccessMessageLocal(m);
    setShowSuccessModalLocal(true);
  }, []);

  const showError = useCallback((t: string, m: string) => {
    setErrorTitleLocal(t);
    setErrorMessageLocal(m);
    setShowErrorModalLocal(true);
  }, []);

  const fetchReelStats = useCallback(async () => {
    try {
      const data = await getStats();
      if (!data) return;
      setReelStats({
        totalItems: Number(data.total) || 0,
        totalStock: Number(data.totalStock) || 0,
        alertes: Number(data.alerte) || 0,
        totalValeur: Number(data.valeur_totale) || 0,
        rupture: Number(data.rupture) || 0,
      });
    } catch (err) {
      console.error('❌ [Produits] Erreur stats:', err);
    }
  }, [getStats]);

  useEffect(() => {
    if (!loading) fetchReelStats();
  }, [loading, fetchReelStats]);

  const {
    showModal, setShowModal,
    showViewModal, setShowViewModal,
    showDeleteModal,
    selectedProduit, setSelectedProduit,
    editingProduit, setEditingProduit,
    deleteTarget,
    selectedIds, setSelectedIds,
    handleSelectAll, handleSelectOne,
    handleBulkDelete, handleConfirmBulkDelete,
    handleDeleteClick, handleConfirmSingleDelete,
    handleCloseProductModal,
    closeDeleteModal,
  } = useProduitsPageModals({
    showError,
    showSuccess,
    loadData,
    fetchReelStats,
    deleteProduit,
    bulkDelete,
  });

  const {
    commandeClients,
    commandeProduits,
    commandeSelectedClientId, setCommandeSelectedClientId,
    commandeSelectedProduits,
    showCommandeModal, setShowCommandeModal,
    montantPayeCommande, setMontantPayeCommande,
    handleNewCommande,
    handleAddProduitCommande,
    handleUpdateQuantiteCommande,
    handleRemoveProduitCommande,
    handleClearPanierCommande,
    handleSubmitCommande,
  } = useProduitsCommandeModal({ showError, showSuccess });

  const handleSelectAllLocal = useCallback((checked: boolean) => {
    handleSelectAll(checked, produits);
  }, [handleSelectAll, produits]);

  const handleViewProduit = useCallback(async (id: number) => {
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      const produit = await getProduitById(id);
      if (!produit) throw new Error('Produit introuvable.');
      setSelectedProduit(produit);
      setShowViewModal(true);
    } catch (err: any) {
      showError('Erreur chargement', err?.message || 'Impossible de charger le produit.');
    }
  }, [getProduitById, showError, setSelectedProduit, setShowViewModal]);

  const handleEditProduit = useCallback(async (produit: any) => {
    if (!produit?.id) return;
    try {
      await loadReferences(true);
      setEditingProduit(produit);
      setShowModal(true);
    } catch (err: any) {
      showError('Erreur', err?.message || 'Impossible de charger les catégories et fournisseurs.');
    }
  }, [loadReferences, showError, setEditingProduit, setShowModal]);

  const handleNewProduit = useCallback(async () => {
    try {
      await loadReferences(true);
      setEditingProduit(null);
      setShowModal(true);
    } catch (err: any) {
      showError('Erreur', err?.message || 'Impossible de charger les catégories et fournisseurs.');
    }
  }, [loadReferences, showError, setEditingProduit, setShowModal]);

  // ⭐⭐⭐ HANDLE SUBMIT — LOGIQUE ERP STANDARD ⭐⭐⭐
  const handleSubmitProduit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const code = String(fd.get('code') || '').trim();
    const nom = String(fd.get('nom') || '').trim();
    const description = String(fd.get('description') || '').trim();
    const categorieRaw = String(fd.get('categorie_id') || '');
    const fournisseurRaw = String(fd.get('fournisseur_id') || '');
    const prixAchat = Number(fd.get('prix_achat') || 0);
    const unite = String(fd.get('unite') || 'pièce').trim();
    const tvaRateRaw = fd.get('tva_rate');
    const tvaRate = (tvaRateRaw !== null && tvaRateRaw !== undefined && tvaRateRaw !== '')
      ? Number(tvaRateRaw)
      : 0.2;
    const categorieId = categorieRaw ? Number(categorieRaw) : null;
    const fournisseurId = fournisseurRaw ? Number(fournisseurRaw) : null;

    // Type de produit
    const typeProduitRaw = String(fd.get('type_produit') || 'fini').trim().toLowerCase();
    const validTypes = ['fini', 'matiere_premiere', 'fourniture'];
    const typeProduit = validTypes.includes(typeProduitRaw) ? typeProduitRaw : 'fini';

    // Boolean
    const isFini = typeProduit === 'fini';
    const isMatiere = typeProduit === 'matiere_premiere';

    // ⭐ ERP STANDARD : Stock initial accepté pour TOUS (facultatif)
    const quantiteStock = Math.max(0, Number(fd.get('quantite_stock') || 0));

    // ⭐ ERP STANDARD : Stock minimum accepté pour TOUS (facultatif)
    const quantiteMinimale = Math.max(0, Number(fd.get('quantite_minimale') || 0));

    // ⭐ Prix de vente : 'fini' IHANY
    const prixVente = isFini ? Number(fd.get('prix_vente') || 0) : 0;

    // ===== VALIDATION =====
    if (!nom)  { showError('Champ requis', 'Le nom est obligatoire.'); return; }
    if (!code) { showError('Champ requis', 'Le code est obligatoire.'); return; }

    // Prix de vente required ho 'fini' IHANY
    if (isFini && (!Number.isFinite(prixVente) || prixVente <= 0)) {
      showError('Valeur invalide', 'Prix de vente doit être > 0.');
      return;
    }

    // Prix d'achat required ho 'matiere_premiere' IHANY
    if (isMatiere && (!Number.isFinite(prixAchat) || prixAchat <= 0)) {
      showError('Valeur invalide', 'Prix d\'achat doit être > 0.');
      return;
    }

    // Fournisseur obligatoire ho 'matiere_premiere'
    if (isMatiere && !fournisseurId) {
      showError('Fournisseur requis', 'Sélectionnez un fournisseur pour la matière première.');
      return;
    }

    const data = {
      code,
      nom,
      description,
      categorie_id: Number.isInteger(categorieId) ? categorieId : null,
      fournisseur_id: Number.isInteger(fournisseurId) ? fournisseurId : null,
      prix_achat: Number.isFinite(prixAchat) ? prixAchat : 0,
      prix_vente: isFini ? prixVente : 0,
      // ⭐ ERP STANDARD : stock initial ho type rehetra
      quantite_stock: quantiteStock,
      // ⭐ ERP STANDARD : stock minimum ho type rehetra
      quantite_minimale: quantiteMinimale,
      unite: unite || 'pièce',
      tva_rate: tvaRate,
      type_produit: typeProduit,
    };

    try {
      if (editingProduit) {
        await updateProduit(Number(editingProduit.id), data);
        showSuccess('Produit modifié', `"${data.nom}" mis à jour.`);
      } else {
        await createProduit(data);
        showSuccess('Produit créé', `"${data.nom}" ajouté.`);
      }
      setShowModal(false);
      setEditingProduit(null);
      await loadData();
      await fetchReelStats();
    } catch (err: any) {
      showError('Erreur sauvegarde', err?.message || 'Impossible de sauvegarder le produit.');
    }
  }, [editingProduit, createProduit, updateProduit, showError, showSuccess, loadData, fetchReelStats, setShowModal, setEditingProduit]);

  const safeTotalItems = Number.isFinite(Number(totalItems)) ? Number(totalItems) : 0;
  const safeTotalPages = Number.isFinite(Number(totalPages)) ? Math.max(1, Number(totalPages)) : 1;

  const handlePageChange = useCallback((page: number) => {
    const nextPage = Math.max(1, Math.min(Number(page) || 1, safeTotalPages));
    if (nextPage === currentPage) return;
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, setCurrentPage, safeTotalPages]);

  const hasActiveFilters = Boolean(
    filters.searchTerm || filters.filterCategorie || filters.filterFournisseur || filters.filterType ||
    filters.prixMin || filters.prixMax || filters.dateFrom || filters.dateTo
  );

  const handleSearchChange = useCallback((v: string) => {
    setFilters(prev => ({ ...prev, searchTerm: v }));
    setCurrentPage(1);
  }, [setFilters, setCurrentPage]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      filterCategorie: '',
      filterFournisseur: '',
      filterType: '',
      prixMin: '',
      prixMax: '',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [setFilters, setCurrentPage, setSelectedIds]);

  const globalStats = useMemo(() => ({
    total: reelStats.totalItems,
    rupture: reelStats.rupture,
    alerte: reelStats.alertes,
    valeurTotale: reelStats.totalValeur,
    totalStock: reelStats.totalStock,
  }), [reelStats]);

  const hasActiveFilter = useMemo(() => Boolean(
    filters.searchTerm ||
    filters.filterCategorie ||
    filters.filterFournisseur ||
    filters.filterType ||
    filters.prixMin ||
    filters.prixMax ||
    filters.dateFrom ||
    filters.dateTo
  ), [filters]);

  const deleteModalTitle = deleteTarget?.type === 'bulk' ? 'Suppression en lot' : 'Suppression du produit';
  const deleteModalMessage = deleteTarget?.type === 'bulk'
    ? `Supprimer définitivement ${deleteTarget.ids.length} produit(s) ? Cette action est irréversible.`
    : `Supprimer définitivement "${deleteTarget?.produit?.nom || ''}" ? Cette action est irréversible.`;

  if (loading && produits.length === 0) {
    return <ProduitsPageSkeleton isDark={isDark} />;
  }

  return (
    <div className="min-h-screen w-full transition-colors duration-300" style={{ background: isDark ? '#0F172A' : '#EEF2FF' }}>
      <div className="mx-auto w-full max-w-[1600px] space-y-2 px-2 py-4 sm:px-3 lg:px-5">
        <ProduitsHeader
          onAddProduit={handleNewProduit}
          onOpenStats={() => {}}
          refreshing={refreshing}
          onRefresh={loadData}
          totalItems={totalItems}
        />
        <ProduitsStats
          totalItems={reelStats.totalItems}
          totalStock={reelStats.totalStock}
          alertes={reelStats.alertes}
          totalValeur={reelStats.totalValeur}
          refreshing={refreshing}
        />

        <ProduitsSearchBar
          searchTerm={filters.searchTerm}
          onSearchChange={handleSearchChange}
          sortOption={sortOption}
          onSortChange={(v) => { setSortOption(v); setCurrentPage(1); }}
          filterCategorie={filters.filterCategorie}
          onFilterCategorieChange={(v) => { setFilters(prev => ({ ...prev, filterCategorie: v })); setCurrentPage(1); }}
          filterFournisseur={filters.filterFournisseur}
          onFilterFournisseurChange={(v) => { setFilters(prev => ({ ...prev, filterFournisseur: v })); setCurrentPage(1); }}
          filterType={filters.filterType}
          onFilterTypeChange={(v) => { setFilters(prev => ({ ...prev, filterType: v })); setCurrentPage(1); }}
          categories={categories}
          fournisseurs={fournisseurs}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <section
          className="relative overflow-hidden rounded-2xl border transition-all duration-300"
          style={{
            background: isDark ? '#0F172A' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
            boxShadow: isDark
              ? '0 4px 24px -4px rgba(0,0,0,0.35)'
              : '0 4px 20px -4px rgba(79,70,229,0.08)',
          }}
        >
          {refreshing && (
            <div className="absolute left-0 right-0 top-0 z-20 h-[3px] overflow-hidden rounded-t-2xl bg-transparent">
              <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-brand-500" />
            </div>
          )}
          <ProduitsTable
            produits={produits}
            onView={handleViewProduit}
            onEdit={handleEditProduit}
            onDelete={handleDeleteClick}
            onAdd={handleNewProduit}
            onNewCommande={handleNewCommande}
            getStockLevel={getStockLevel}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            totalStats={{
              total: reelStats.totalItems,
              rupture: reelStats.rupture,
              alerte: reelStats.alertes,
              valeur_totale: reelStats.totalValeur,
            }}
            totalItems={safeTotalItems}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAllLocal}
            onSelectOne={handleSelectOne}
            onBulkDelete={handleBulkDelete}
            globalStats={globalStats}
            hasActiveFilter={hasActiveFilter}
          />
        </section>

        {!loading && safeTotalItems > 0 && (
          <div
            className="flex items-center justify-between rounded-2xl border px-3 py-2.5 transition-all duration-300"
            style={{
              background: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
            }}
          >
            <ProduitsPagination
              currentPage={currentPage}
              totalPages={safeTotalPages}
              totalItems={safeTotalItems}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        <ProduitsModalForm
          isOpen={showModal}
          onClose={handleCloseProductModal}
          onSubmit={handleSubmitProduit}
          editingProduit={editingProduit}
          categories={categories}
          fournisseurs={fournisseurs}
          generateCode={generateCode}
          isDark={isDark}
        />

        {showViewModal && selectedProduit && (
          <ProduitsViewModal
            produit={selectedProduit}
            onClose={() => setShowViewModal(false)}
            onEdit={() => { setShowViewModal(false); handleEditProduit(selectedProduit); }}
            onNewCommande={() => { setShowViewModal(false); handleNewCommande(selectedProduit); }}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            isDark={isDark}
          />
        )}

        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={closeDeleteModal}
          onConfirm={() => deleteTarget?.type === 'bulk' ? handleConfirmBulkDelete() : handleConfirmSingleDelete()}
          title={deleteModalTitle}
          message={deleteModalMessage}
          confirmText="Supprimer"
          cancelText="Annuler"
          confirmColor="red"
          isDark={isDark}
        />

        <CommandesModalForm
          isOpen={showCommandeModal}
          onClose={() => { setShowCommandeModal(false); handleClearPanierCommande(); }}
          onSubmit={handleSubmitCommande}
          clients={commandeClients}
          produits={commandeProduits}
          selectedClientId={commandeSelectedClientId}
          onClientChange={setCommandeSelectedClientId}
          selectedProduits={commandeSelectedProduits}
          onAddProduit={handleAddProduitCommande}
          onUpdateQuantite={handleUpdateQuantiteCommande}
          onRemoveProduit={handleRemoveProduitCommande}
          onClearPanier={handleClearPanierCommande}
          isDark={isDark}
          montantPaye={montantPayeCommande}
          onMontantPayeChange={setMontantPayeCommande}
        />

        <SuccessModal
          isOpen={showSuccessModalLocal}
          onClose={() => setShowSuccessModalLocal(false)}
          title={successTitleLocal}
          message={successMessageLocal}
          buttonText="OK"
          autoCloseDelay={3000}
          zIndex={100000}
        />

        <ErrorModal
          isOpen={showErrorModalLocal}
          onClose={() => setShowErrorModalLocal(false)}
          title={errorTitleLocal}
          message={errorMessageLocal}
          buttonText="OK"
          autoCloseDelay={4000}
          zIndex={100000}
        />
      </div>
    </div>
  );
};

export default Produits;