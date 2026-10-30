// src/components/dashboard/hooks/useDashboardKPIs.ts
// ⭐ KPIs ho an'ny Dashboard (VENTES + STOCK)
// ⭐ FIX: Salaires synchronisés amin'ny module Paiements (montant + avance)
// ⭐ NOUVEAU: salairesEnAttente + nbPaiementsEnAttente
// ⭐ FIX: Nampiana ny 3 KPI very (Commandes, Clients, Panier moyen)
//        → 8 KPI = 2 lignes × 4 colonnes (feno 1 row)
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Receipt,
  ShoppingCart,
  Users,
  UserCheck,
  CreditCard,
  AlertTriangle,
  PackageX,
  Package,
  Boxes,
  RefreshCw,
  BarChart3,
  AlertCircle,
  Clock,
  ShoppingBag,
} from 'lucide-react';
import { safeNumber } from '../utils/variation';

// ============================================================
// TYPES
// ============================================================

export interface DashboardStats {
  // Ventes
  chiffreAffaires?: number;
  chiffreAffairesPaye?: number;
  depenses?: number;
  achats?: number;
  cogs?: number;
  beneficeNet?: number;

  // Salaires (module Paiements)
  salaires?: number;
  salairesPayes?: number;
  salairesEnAttente?: number;
  nbPaiementsPayes?: number;
  nbPaiementsEnAttente?: number;
  totalPaiements?: number;

  // Commandes / Clients
  commandesTotal?: number;
  commandesEnAttente?: number;
  clientsActifs?: number;
  totalClients?: number;
  totalDette?: number;
  nbCommandesNonPayees?: number;

  // Stock
  stockValue?: number;
  ruptureStock?: number;
  alertesStock?: number;
  stockNormal?: number;
  stockTotal?: number;
  totalProduits?: number;
  rotationRate?: number;

  // Variations
  variationChiffreAffaires?: number;
  variationBenefice?: number;
  variationCommandesTotal?: number;
  variationCommandes?: number;
  variationClients?: number;
  variationDepenses?: number;
  variationAchats?: number;
  variationSalaires?: number;
  variationStockValue?: number;
  variationRupture?: number;
  variationAlertes?: number;
  variationStockNormal?: number;
  variationRotation?: number;
}

export interface ChartItem {
  label?: string;
  date?: string;
  mois?: string | number;
  nom?: string;
  categorie?: string;
  total?: number;
  total_ventes?: number;
  nb_commandes?: number;
}

export interface KpiItem {
  key: string;
  title: string;
  value: number;
  variation?: number;
  variationLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  money?: boolean;
  negative?: boolean;
  showSign?: boolean;
  unit?: string;
  sparkline?: number[];
  sparklineColor?: string;
  tooltip?: string;
}

// ============================================================
// HOOK
// ============================================================

export const useDashboardKPIs = (stats: DashboardStats, chartsData: any) => {
  // ═══════════ Extraction sécurisée ═══════════
  const safeStats = stats || {};

  const chiffreAffaires  = safeNumber(safeStats.chiffreAffaires);
  const depenses         = safeNumber(safeStats.depenses);
  const achats           = safeNumber(safeStats.achats);
  const beneficeNet      = safeNumber(safeStats.beneficeNet);

  // ⭐ Salaires — montant + avance (naloa)
  const salairesPayes    = safeNumber(safeStats.salairesPayes ?? safeStats.salaires);
  const salairesEnAttente = safeNumber(safeStats.salairesEnAttente);
  const nbPaiementsPayes  = safeNumber(safeStats.nbPaiementsPayes);
  const nbPaiementsEnAttente = safeNumber(safeStats.nbPaiementsEnAttente);

  // Commandes / Clients
  const commandesTotal   = safeNumber(safeStats.commandesTotal);
  const commandesEnAttente = safeNumber(safeStats.commandesEnAttente);
  const clientsActifs    = safeNumber(safeStats.clientsActifs);
  const totalClients     = safeNumber(safeStats.totalClients);
  const detteClient      = safeNumber(safeStats.totalDette);
  const commandesNonPayees = safeNumber(safeStats.nbCommandesNonPayees);

  // Stock
  const stockValue       = safeNumber(safeStats.stockValue);
  const ruptureStock     = safeNumber(safeStats.ruptureStock);
  const alertesStock     = safeNumber(safeStats.alertesStock);
  const stockTotal       = safeNumber(safeStats.stockTotal);
  const totalProduits    = safeNumber(safeStats.totalProduits);
  const rotationRate     = safeNumber(safeStats.rotationRate);

  // ⭐ Panier moyen (calculé côté frontend si non fourni)
  const panierMoyen = useMemo(() => {
    if (commandesTotal <= 0) return 0;
    return Math.round(chiffreAffaires / commandesTotal);
  }, [chiffreAffaires, commandesTotal]);

  // ═══════════ Sparklines ═══════════
  const sparklineData = useMemo(() => ({
    ca:         Array.isArray(chartsData?.sparkline?.ca)         ? chartsData.sparkline.ca         : [],
    benefice:   Array.isArray(chartsData?.sparkline?.benefice)   ? chartsData.sparkline.benefice   : [],
    commandes:  Array.isArray(chartsData?.sparkline?.commandes)  ? chartsData.sparkline.commandes  : [],
    clients:    Array.isArray(chartsData?.sparkline?.clients)    ? chartsData.sparkline.clients    : [],
    salaires:   Array.isArray(chartsData?.sparkline?.salaires)   ? chartsData.sparkline.salaires   : [],
    achats:     Array.isArray(chartsData?.sparkline?.achats)     ? chartsData.sparkline.achats     : [],
    depenses:   Array.isArray(chartsData?.sparkline?.depenses)   ? chartsData.sparkline.depenses   : [],
    stockValue: Array.isArray(chartsData?.sparkline?.stockValue) ? chartsData.sparkline.stockValue : [],
    rupture:    Array.isArray(chartsData?.sparkline?.rupture)    ? chartsData.sparkline.rupture    : [],
    alertes:    Array.isArray(chartsData?.sparkline?.alertes)    ? chartsData.sparkline.alertes    : [],
    stockNormal: Array.isArray(chartsData?.sparkline?.stockNormal) ? chartsData.sparkline.stockNormal : [],
    rotation:   Array.isArray(chartsData?.sparkline?.rotation)   ? chartsData.sparkline.rotation   : [],
  }), [chartsData]);

  // ═══════════ KPIs VENTES (8 cards — 2 lignes × 4 colonnes) ═══════════
  const kpisVentes = useMemo<KpiItem[]>(() => [
    // 1. Chiffre d'affaires
    {
      key: 'ca',
      title: "Chiffre d'affaires",
      value: chiffreAffaires,
      variation: safeNumber(safeStats.variationChiffreAffaires),
      icon: React.createElement(DollarSign, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      money: true,
      sparkline: sparklineData.ca,
      sparklineColor: '#6366F1',
      tooltip: `${commandesTotal} commande(s) — Panier moyen : ${panierMoyen.toLocaleString('fr-FR')} Ar`,
    },

    // 2. Bénéfice net
    {
      key: 'benefice',
      title: 'Bénéfice net',
      value: beneficeNet,
      variation: safeNumber(safeStats.variationBenefice),
      icon: beneficeNet >= 0
        ? React.createElement(TrendingUp, { size: 16, strokeWidth: 2.2 })
        : React.createElement(TrendingDown, { size: 16, strokeWidth: 2.2 }),
      iconBg: beneficeNet >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      iconColor: beneficeNet >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400',
      money: true,
      showSign: true,
      sparkline: sparklineData.benefice,
      sparklineColor: beneficeNet >= 0 ? '#10B981' : '#EF4444',
      tooltip: `CA − Dépenses − Achats − Salaires payés`,
    },

    // 3. Dépenses
    {
      key: 'depenses',
      title: 'Dépenses',
      value: depenses,
      variation: safeNumber(safeStats.variationDepenses),
      icon: React.createElement(Receipt, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-600 dark:text-rose-400',
      money: true,
      negative: true,
      sparkline: sparklineData.depenses,
      sparklineColor: '#F43F5E',
      tooltip: 'Total des dépenses de la période',
    },

    // 4. Achats
    {
      key: 'achats',
      title: 'Achats',
      value: achats,
      variation: safeNumber(safeStats.variationAchats),
      icon: React.createElement(ShoppingCart, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      money: true,
      negative: true,
      sparkline: sparklineData.achats,
      sparklineColor: '#F59E0B',
      tooltip: 'Total des achats fournisseurs',
    },

    // 5. ⭐ Salaires — SYNCHRONISÉ amin'ny Paiements
    {
      key: 'salaires',
      title: 'Salaires',
      value: salairesPayes,
      variation: safeNumber(safeStats.variationSalaires),
      icon: React.createElement(Wallet, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
      money: true,
      sparkline: sparklineData.salaires,
      sparklineColor: '#8B5CF6',
      tooltip: nbPaiementsEnAttente > 0
        ? `${nbPaiementsPayes} payé(s) • ${nbPaiementsEnAttente} en attente — ${salairesEnAttente.toLocaleString('fr-FR')} Ar`
        : `${nbPaiementsPayes} paiement(s) — Tous à jour`,
    },

    // ⭐⭐⭐ 6. Commandes (nampiana indray) ⭐⭐⭐
    {
      key: 'commandes',
      title: 'Commandes',
      value: commandesTotal,
      variation: safeNumber(safeStats.variationCommandesTotal ?? safeStats.variationCommandes),
      icon: React.createElement(ShoppingBag, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-600 dark:text-sky-400',
      sparkline: sparklineData.commandes,
      sparklineColor: '#0EA5E9',
      tooltip: commandesEnAttente > 0
        ? `${commandesTotal} commande(s) • ${commandesEnAttente} en attente`
        : `${commandesTotal} commande(s) au total`,
    },

    // ⭐⭐⭐ 7. Clients actifs (nampiana indray) ⭐⭐⭐
    {
      key: 'clients',
      title: 'Clients actifs',
      value: clientsActifs,
      variation: safeNumber(safeStats.variationClients),
      icon: React.createElement(UserCheck, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      sparkline: sparklineData.clients,
      sparklineColor: '#06B6D4',
      tooltip: totalClients > 0
        ? `${clientsActifs} actif(s) • ${totalClients} au total`
        : `${clientsActifs} client(s) actif(s)`,
    },

    // ⭐⭐⭐ 8. Panier moyen (nampiana indray) ⭐⭐⭐
    {
      key: 'panier',
      title: 'Panier moyen',
      value: panierMoyen,
      variation: undefined,
      icon: React.createElement(CreditCard, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-pink-500/10',
      iconColor: 'text-pink-600 dark:text-pink-400',
      money: true,
      sparkline: [],
      sparklineColor: '#EC4899',
      tooltip: commandesTotal > 0
        ? `CA ÷ ${commandesTotal} commande(s)`
        : 'Aucune commande',
    },
  ], [
    chiffreAffaires, beneficeNet, depenses, achats, salairesPayes,
    salairesEnAttente, nbPaiementsPayes, nbPaiementsEnAttente,
    commandesTotal, commandesEnAttente, clientsActifs, totalClients,
    panierMoyen, safeStats, sparklineData,
  ]);

  // ═══════════ KPIs STOCK (4 cards — EtatOperationnelStock) ═══════════
  const kpisStock = useMemo<KpiItem[]>(() => [
    // 1. Valeur du stock
    {
      key: 'stockValue',
      title: 'Valeur du stock',
      value: stockValue,
      variation: safeNumber(safeStats.variationStockValue),
      icon: React.createElement(Package, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      money: true,
      sparkline: sparklineData.stockValue,
      sparklineColor: '#6366F1',
      tooltip: `${totalProduits} produit(s) — ${stockTotal} unité(s)`,
    },

    // 2. Alertes stock
    {
      key: 'alertesStock',
      title: 'Alertes stock',
      value: alertesStock,
      variation: safeNumber(safeStats.variationAlertes),
      icon: React.createElement(AlertTriangle, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      negative: true,
      sparkline: sparklineData.alertes,
      sparklineColor: '#F59E0B',
      tooltip: 'Produits en dessous du seuil minimal',
    },

    // 3. Rupture de stock
    {
      key: 'ruptureStock',
      title: 'Rupture de stock',
      value: ruptureStock,
      variation: safeNumber(safeStats.variationRupture),
      icon: React.createElement(PackageX, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
      negative: true,
      sparkline: sparklineData.rupture,
      sparklineColor: '#EF4444',
      tooltip: 'Produits totalement épuisés',
    },

    // 4. Rotation du stock
    {
      key: 'rotationRate',
      title: 'Rotation du stock',
      value: rotationRate,
      variation: safeNumber(safeStats.variationRotation),
      icon: React.createElement(RefreshCw, { size: 16, strokeWidth: 2.2 }),
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      unit: '×',
      sparkline: sparklineData.rotation,
      sparklineColor: '#06B6D4',
      tooltip: 'Nombre de rotations sur 30 jours',
    },
  ], [stockValue, alertesStock, ruptureStock, rotationRate, totalProduits, stockTotal, safeStats, sparklineData]);

  // ═══════════ KPIs SECONDAIRES (info — ampiasaina amin'ny Alerts) ═══════════
  const kpisSecondaires = useMemo(() => ({
    commandesTotal,
    commandesEnAttente,
    panierMoyen,
    clientsActifs,
    totalClients,
    detteClient,
    commandesNonPayees,
    nbPaiementsPayes,
    nbPaiementsEnAttente,
    salairesEnAttente,
  }), [
    commandesTotal, commandesEnAttente, panierMoyen,
    clientsActifs, totalClients, detteClient, commandesNonPayees,
    nbPaiementsPayes, nbPaiementsEnAttente, salairesEnAttente,
  ]);

  return {
    // ═══ Valeurs principales ═══
    chiffreAffaires,
    depenses,
    achats,
    beneficeNet,
    salairesPayes,
    salairesEnAttente,
    nbPaiementsPayes,
    nbPaiementsEnAttente,
    commandesTotal,
    commandesEnAttente,
    panierMoyen,
    clientsActifs,
    totalClients,
    detteClient,
    commandesNonPayees,

    // ═══ Stock ═══
    stockValue,
    ruptureStock,
    alertesStock,
    stockNormal: safeNumber(safeStats.stockNormal),
    stockTotal,
    totalProduits,
    rotationRate,

    // ═══ Listes KPIs ═══
    kpisVentes,
    kpisStock,
    kpisSecondaires,
  };
};

export default useDashboardKPIs;