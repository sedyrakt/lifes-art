// ============================================================
// src/types/dashboard.ts
// ⭐ FANITSARA: Ampiana totalEntrees, totalSorties, totalMouvements
// ============================================================

export interface DashboardStats {
  totalProduits: number;
  stockTotal: number;
  alertesStock: number;
  ruptureStock: number;
  valeurStock: number;
  entreesMois: number;
  sortiesMois: number;
  commandesEnAttente: number;
  commandesTotal: number;
  totalClients: number;
  totalFournisseurs: number;
  totalEmployes: number;
  totalPaiements: number;
  masseSalariale: number;
  chiffreAffaires: number;
  beneficeNet: number;
  // ⭐ FANITSARA VAOVAO
  totalEntrees: number;
  totalSorties: number;
  totalMouvements: number;
}

export interface DashboardData {
  stats: DashboardStats;
  produitsRecents: any[];
  mouvementsRecents: any[];
  alertesProduits: any[];
  topProduits: any[];
  commandesRecentes: any[];
  paiementsRecents: any[];
  monthlyEntries: number[];
  monthlyOutputs: number[];
  commandesData: number[];
  monthlyRevenus: number[];
}