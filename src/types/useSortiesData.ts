// src/hooks/useSortiesData.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { SortieStock, SortiesStats, SortiesFilters } from '../types/sorties';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const ITEMS_PER_PAGE = 10;

export const useSortiesData = () => {
  // ============ STATES ============
  const [sorties, setSorties] = useState<SortieStock[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProduit, setFilterProduit] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('Date (Récent)');
  
  // Stats
  const [statsData, setStatsData] = useState<SortiesStats>({
    totalSorties: 0,
    totalQuantite: 0,
    totalValeur: 0,
    destinations: 0,
  });
  
  const previousStatsRef = useRef<SortiesStats>({
    totalSorties: 0,
    totalQuantite: 0,
    totalValeur: 0,
    destinations: 0,
  });

  // Refs
  const isMounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);

  // ============ CLEANUP ============
  const cancelRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cancelRequests();
    };
  }, [cancelRequests]);

  // ============ CHARGEMENT DES SORTIES ============
  const loadSorties = useCallback(async (isRefresh = false) => {
    if (fetchingRef.current) {
      console.log('⏳ [loadSorties] Déjà en cours, ignore');
      return;
    }

    try {
      fetchingRef.current = true;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // ⭐ 1. Charger la liste paginée
      const options: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      if (filterProduit) {
        options.produitId = parseInt(filterProduit);
      }
      if (searchTerm) {
        options.search = searchTerm;
      }
      if (sortOption) {
        const sortMap: Record<string, { field: string; direction: string }> = {
          'Date (Récent)': { field: 'date_sortie', direction: 'DESC' },
          'Date (Ancien)': { field: 'date_sortie', direction: 'ASC' },
          'Quantité (Croissant)': { field: 'quantite', direction: 'ASC' },
          'Quantité (Décroissant)': { field: 'quantite', direction: 'DESC' },
          'Prix (Croissant)': { field: 'prix_unitaire', direction: 'ASC' },
          'Prix (Décroissant)': { field: 'prix_unitaire', direction: 'DESC' },
        };
        const sortConfig = sortMap[sortOption] || sortMap['Date (Récent)'];
        options.sortBy = sortConfig.field;
        options.sortOrder = sortConfig.direction;
      }

      const result = await window.api.stock.getSorties(options);
      if (!result?.success) throw new Error(result?.error || 'Erreur chargement');

      const { data, pagination } = result;
      if (isMounted.current) {
        setSorties(data || []);
        setTotalItems(pagination?.total || 0);
      }

      // ⭐ 2. Charger toutes les données pour les statistiques
      const allOptions: any = {
        limit: 10000,
        page: 1,
      };
      if (filterProduit) {
        allOptions.produitId = parseInt(filterProduit);
      }
      if (searchTerm) {
        allOptions.search = searchTerm;
      }

      const allResult = await window.api.stock.getSorties(allOptions);
      if (!allResult?.success) throw new Error(allResult?.error || 'Erreur stats');

      const allData = allResult.data || [];

      const totalSorties = allData.length;
      const totalQuantite = allData.reduce((sum: number, s: any) => sum + (s.quantite || 0), 0);
      const totalValeur = allData.reduce((sum: number, s: any) => sum + ((s.quantite || 0) * (s.prix_unitaire || 0)), 0);
      const destinations = new Set(allData.map((s: any) => s.destination).filter(Boolean)).size;

      if (isMounted.current) {
        previousStatsRef.current = { ...statsData };
        setStatsData({
          totalSorties,
          totalQuantite,
          totalValeur,
          destinations,
        });
      }

      // ⭐ 3. Charger les produits pour le formulaire
      const produitsResult = await window.api.products.getAll({
        limit: 1000,
        status: 'actif'
      });

      if (isMounted.current) {
        const produitsData = (produitsResult?.success ? produitsResult.data : [])
          .filter((p: any) => p.quantite_stock > 0);
        setProduits(produitsData);
      }

      if (isRefresh) toast.success('✅ Sorties actualisées');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erreur chargement sorties:', error);
        if (isMounted.current) toast.error('Erreur lors du chargement des sorties');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        fetchingRef.current = false;
      }
    }
  }, [currentPage, filterProduit, searchTerm, sortOption, statsData]);

  // ============ CHARGEMENT INITIAL ============
  const loadData = useCallback(async () => {
    cancelRequests();
    abortControllerRef.current = new AbortController();
    await loadSorties(false);
  }, [cancelRequests, loadSorties]);

  useEffect(() => {
    loadData();
    return () => cancelRequests();
  }, [loadData, cancelRequests]);

  // ============ RECHARGEMENT QUAND FILTRES CHANGENT ============
  useEffect(() => {
    if (!loading && isMounted.current && !fetchingRef.current) {
      loadSorties(false);
    }
  }, [currentPage, filterProduit, searchTerm, sortOption, loadSorties, loading]);

  // ============ CRUD ============
  const createSortie = useCallback(async (data: any) => {
    const result = await window.api.stock.createSortie(data);
    if (!result?.success) throw new Error(result?.error || 'Erreur création');
    return result.data;
  }, []);

  // ============ REALTIME ============
  useEffect(() => {
    const handleDataChanged = (_event: any, data: any) => {
      console.log('🔄 [SortiesStock] Données modifiées:', data);
      if (isMounted.current && !fetchingRef.current) {
        loadSorties(false);
        if (data && data.type) {
          const msg = data.type === 'SORTIE' ? 'Sortie' : 'Entrée';
          toast.success(`📦 ${msg} de stock détectée`, { id: 'realtime-sorties' });
        } else {
          toast.success('📊 Mise à jour des sorties détectée', { id: 'realtime-sorties' });
        }
      }
    };

    const unsubscribers: (() => void)[] = [];

    if (ipcRenderer) {
      ipcRenderer.on('stock:mouvement-added', handleDataChanged);
      ipcRenderer.on('financial:changed', handleDataChanged);

      unsubscribers.push(() => {
        ipcRenderer.removeListener('stock:mouvement-added', handleDataChanged);
        ipcRenderer.removeListener('financial:changed', handleDataChanged);
      });
    } else {
      console.warn('⚠️ ipcRenderer non disponible');
      if (window.api?.stock?.onMouvementAdded) {
        const unsub = window.api.stock.onMouvementAdded(() => {
          if (!fetchingRef.current) loadSorties(false);
        });
        unsubscribers.push(unsub);
      }
      if (window.api?.financial?.onChanged) {
        const unsub = window.api.financial.onChanged(() => {
          if (!fetchingRef.current) loadSorties(false);
        });
        unsubscribers.push(unsub);
      }
    }

    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [loadSorties]);

  // ============ RETOUR ============
  return {
    // États
    sorties,
    produits,
    loading,
    refreshing,
    setRefreshing,
    totalItems,
    currentPage,
    setCurrentPage,
    searchTerm,
    setSearchTerm,
    filterProduit,
    setFilterProduit,
    sortOption,
    setSortOption,
    statsData,
    previousStatsRef: previousStatsRef.current,
    
    // Fonctions
    loadData,
    loadSorties,
    createSortie,
    cancelRequests,
    
    // Constantes
    ITEMS_PER_PAGE,
  };
};