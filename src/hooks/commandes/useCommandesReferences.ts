// src/hooks/commandes/useCommandesReferences.ts
// ⭐ ESORINA `status: 'actif'` amin'ny products.getAll (efa nesorina ny statut)
// ⭐ Ny `produits` dia `any[]` — mitazona ny `type_produit` avy amin'ny backend
//    (ilaina ho an'ny filtre "produit fini ihany" ao amin'ny CommandesProductSelector)

import { useCallback, useRef, useState } from 'react';

/**
 * ⭐ Clients + Produits (chargés une seule fois)
 */
export const useCommandesReferences = () => {
  const clientsLoaded = useRef(false);
  const produitsLoaded = useRef(false);

  const [clients, setClients] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);

  const loadClientsAndProduits = useCallback(async () => {
    try {
      if (!clientsLoaded.current) {
        const result = await window.api.clients.getAll({ limit: 1000 });
        if (result?.success) setClients(result.data || []);
        clientsLoaded.current = true;
      }
      if (!produitsLoaded.current) {
        // ⭐ ESORINA `status: 'actif'` — tsy misy statut intsony
        // ⭐ Ny backend dia mamerina `type_produit` ao amin'ny réponse
        const result = await window.api.products.getAll({ limit: 1000 });
        if (result?.success) setProduits(result.data || []);
        produitsLoaded.current = true;
      }
    } catch (error) {
      console.error('❌ loadClientsAndProduits:', error);
    }
  }, []);

  return {
    clients,
    produits,
    loadClientsAndProduits,
    clientsLoaded,
    produitsLoaded,
  };
};