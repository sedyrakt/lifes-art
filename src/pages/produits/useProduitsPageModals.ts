// src/pages/produits/useProduitsPageModals.ts
// ⭐ HARD DELETE — esorina daholo ny logic "bulk update status"
//    (showBulkStatusModal, bulkStatusData, handleBulkUpdateStatus,
//     handleConfirmBulkStatusUpdate, closeBulkStatusModal, bulkUpdateStatus param)

import { useCallback, useState } from 'react';

interface UseProduitsPageModalsParams {
  showError: (t: string, m: string) => void;
  showSuccess: (t: string, m: string) => void;
  loadData: () => Promise<void>;
  fetchReelStats: () => Promise<void>;
  deleteProduit: (id: number) => Promise<any>;
  bulkDelete: (ids: number[]) => Promise<any>;
  // ❌ ESORINA: bulkUpdateStatus
}

export const useProduitsPageModals = ({
  showError,
  showSuccess,
  loadData,
  fetchReelStats,
  deleteProduit,
  bulkDelete,
}: UseProduitsPageModalsParams) => {
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState<any>(null);
  const [editingProduit, setEditingProduit] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleSelectAll = useCallback((checked: boolean, produits: any[]) => {
    if (!checked) { clearSelection(); return; }
    const ids = produits.map((p: any) => Number(p.id)).filter((id: number) => Number.isInteger(id) && id > 0);
    setSelectedIds(new Set(ids));
  }, [clearSelection]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (checked) n.add(id); else n.delete(id);
      return n;
    });
  }, []);

  // ============================================================
  // ⭐ BULK DELETE (hard delete)
  // ============================================================
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setDeleteTarget({ type: 'bulk', ids });
    setShowDeleteModal(true);
  }, [selectedIds]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!deleteTarget || deleteTarget.type !== 'bulk') return;
    try {
      await bulkDelete(deleteTarget.ids);
      clearSelection();
      showSuccess(
        'Suppression terminée',
        `${deleteTarget.ids.length} produit(s) supprimé(s) définitivement.`
      );
      await loadData();
      await fetchReelStats();
    } catch (err: any) {
      showError('Erreur', err?.message || 'Erreur lors de la suppression.');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, bulkDelete, clearSelection, showError, showSuccess, loadData, fetchReelStats]);

  // ============================================================
  // ⭐ SINGLE DELETE (hard delete)
  // ============================================================
  const handleDeleteClick = useCallback((produit: any) => {
    if (!produit?.id) return;
    setDeleteTarget({ type: 'single', produit });
    setShowDeleteModal(true);
  }, []);

  const handleConfirmSingleDelete = useCallback(async () => {
    if (!deleteTarget || deleteTarget.type !== 'single') return;
    const produit = deleteTarget.produit;
    if (!produit?.id) { setShowDeleteModal(false); setDeleteTarget(null); return; }
    try {
      await deleteProduit(Number(produit.id));
      showSuccess('Produit supprimé', `"${produit.nom}" supprimé définitivement.`);
      await loadData();
      await fetchReelStats();
    } catch (err: any) {
      showError('Erreur', err?.message || 'Erreur suppression produit.');
    } finally {
      setShowDeleteModal(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteProduit, showError, showSuccess, loadData, fetchReelStats]);

  // ============================================================
  // ⭐ CLOSE MODALS
  // ============================================================
  const handleCloseProductModal = useCallback(() => {
    setShowModal(false);
    setEditingProduit(null);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  }, []);

  // ❌ ESORINA: closeBulkStatusModal

  return {
    // States
    showModal, setShowModal,
    showViewModal, setShowViewModal,
    showDeleteModal, setShowDeleteModal,
    selectedProduit, setSelectedProduit,
    editingProduit, setEditingProduit,
    deleteTarget, setDeleteTarget,
    selectedIds, setSelectedIds,
    showSuccess,
    showError,
    clearSelection,
    handleSelectAll, handleSelectOne,
    handleBulkDelete, handleConfirmBulkDelete,
    handleDeleteClick, handleConfirmSingleDelete,
    handleCloseProductModal,
    closeDeleteModal
  };
};