// src/hooks/dashboard/constants.ts
// ⭐ FIX: Nampiana 'achats: 0' ao amin'ny INITIAL_STATS
// ⭐ FIX: Nampiana sparklineDepenses/Achats/Salaires ao amin'ny INITIAL_CHARTS

import type { DashboardStats, DashboardChartsData } from './types';

export const DEBUG = false;

export const INITIAL_STATS: DashboardStats = {
  // ═══ VENTES ═══
  chiffreAffaires: 0,
  depenses: 0,
  achats: 0,                     // ⭐ NOUVEAU
  salaires: 0,
  salairesPayes: 0,
  beneficeNet: 0,
  commandesTotal: 0,
  commandesEnAttente: 0,
  clientsActifs: 0,
  totalClients: 0,

  // ═══ STOCK ═══
  stockValue: 0,
  stockTotal: 0,
  totalProduits: 0,
  ruptureStock: 0,
  alertesStock: 0,
  stockNormal: 0,
  rotationRate: 0,

  // ═══ DETTE ═══
  totalDette: 0,
  nbCommandesNonPayees: 0,
  totalPaiements: 0,

  // ═══ META ═══
  firstClientDate: null,
  startDate: null,
  endDate: null,
};

export const INITIAL_CHARTS: DashboardChartsData = {
  ventesParMois: [],
  topProduits: [],
  categorieRepartition: [],
  stockStatus: { en_stock: 0, stock_bas: 0, rupture: 0 },
  entreesStock: [],
  sortiesStock: [],
  topClients: [],
  depensesParCategorie: [],
  commandesStatut: [],
  ruptureStockDetails: [],
  detteClientsDetails: [],
  commandesEnAttenteDetails: [],

  // ⭐ Sparklines VENTES
  sparklineCA: [],
  sparklineBenefice: [],
  sparklineCommandes: [],
  sparklineClients: [],

  // ⭐ VAOVAO: Sparklines DÉPENSES / ACHATS / SALAIRES
  sparklineDepenses: [],
  sparklineAchats: [],
  sparklineSalaires: [],

  // ⭐ Sparklines STOCK
  sparklineStockValue: [],
  sparklineRupture: [],
  sparklineAlertes: [],
  sparklineRotation: [],
};