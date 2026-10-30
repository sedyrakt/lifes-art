// src/hooks/achats/useAchatsReferences.ts
// ⭐ ESORINA `status: 'actif'` amin'ny products.getAll (efa nesorina ny statut)
// ⭐ Ny `produits` dia `any[]` — mitazona ny `fournisseur_id` avy amin'ny backend
//    (ilaina ho an'ny filtre produits par fournisseur ao amin'ny Nouvel achat)

import { useCallback, useRef, useState } from 'react';

/**
 * ⭐ Fournisseurs + Produits — refs + states
 */
export const useAchatsReferences = () => {
  const fournisseursLoaded = useRef(false);
  const produitsLoaded = useRef(false);

  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);

  const loadReferences = useCallback(async (force = false) => {
    // ── FOURNISSEURS ──
    if (!fournisseursLoaded.current || force) {
      try {
        if (window.api?.fournisseurs?.getAll) {
          const result = await window.api.fournisseurs.getAll({ limit: 1000 });
          if (result?.success) {
            setFournisseurs(result.data || []);
            fournisseursLoaded.current = true;
          }
        }
      } catch (err) {
        console.error('❌ Erreur chargement fournisseurs:', err);
      }
    }

    // ── PRODUITS ──
    if (!produitsLoaded.current || force) {
      try {
        const produitsApi = window.api?.produits || window.api?.products;
        if (produitsApi?.getAll) {
          // ⭐ ESORINA `status: 'actif'` — tsy misy statut intsony
          // ⭐ Ilaina ny `fournisseur_id` ao amin'ny réponse (avy amin'ny SELECT backend)
          const result = await produitsApi.getAll({ limit: 500 });
          if (result?.success) {
            setProduits(result.data || []);
            produitsLoaded.current = true;
          }
        }
      } catch (err) {
        console.error('❌ Erreur chargement produits:', err);
      }
    }
  }, []);

  return {
    fournisseurs,
    produits,
    loadReferences,
    fournisseursLoaded,
    produitsLoaded,
  };
};