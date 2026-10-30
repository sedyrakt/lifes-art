// lib/formatMoney.ts
// ⭐ FORMAT MONEY - AVEC K, M, Md
// ⭐ HO AN'NY FAMPIASANA REHETRA AO AMIN'NY APPLICATION

/**
 * Formatte un montant en Ariary avec des suffixes K, M, Md
 * 
 * @param amount - Le montant à formater (nombre)
 * @param options - Options de formatage
 * @returns Le montant formaté en string
 * 
 * @example
 * formatMoney(500) // "500 Ar"
 * formatMoney(1500) // "1.5 K Ar"
 * formatMoney(45000) // "45 K Ar"
 * formatMoney(1200000) // "1.2 M Ar"
 * formatMoney(2500000000) // "2.5 Md Ar"
 */
export const formatMoney = (
  amount: number,
  options: {
    /** Utiliser la virgule comme séparateur décimal (par défaut: true) */
    useComma?: boolean;
    /** Afficher le symbole Ar (par défaut: true) */
    showSymbol?: boolean;
    /** Nombre de décimales pour les grands nombres (par défaut: 1) */
    decimals?: number;
    /** Utiliser l'espace insécable (par défaut: true) */
    useThinSpace?: boolean;
  } = {}
): string => {
  // Valeurs par défaut
  const {
    useComma = true,
    showSymbol = true,
    decimals = 1,
    useThinSpace = true,
  } = options;

  // Gérer les valeurs nulles ou undefined
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 Ar';
  }

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  // Séparateur décimal
  const decimalSeparator = useComma ? ',' : '.';
  const thousandSeparator = useThinSpace ? '\u202F' : ' ';

  let formattedValue: string;
  let suffix = '';

  // Déterminer le suffixe en fonction du montant
  if (absAmount >= 1_000_000_000) {
    // Milliards (Md)
    const value = absAmount / 1_000_000_000;
    formattedValue = value.toFixed(decimals).replace('.', decimalSeparator);
    suffix = 'Md';
  } else if (absAmount >= 1_000_000) {
    // Millions (M)
    const value = absAmount / 1_000_000;
    formattedValue = value.toFixed(decimals).replace('.', decimalSeparator);
    suffix = 'M';
  } else if (absAmount >= 1_000) {
    // Milliers (K)
    const value = absAmount / 1_000;
    // Pas de décimale pour les milliers (arrondi)
    formattedValue = value.toFixed(0).replace('.', decimalSeparator);
    suffix = 'K';
  } else {
    // Moins de 1000 - format standard
    formattedValue = absAmount.toLocaleString('fr-FR', {
      useGrouping: true,
    });
    suffix = '';
  }

  // Supprimer les zéros inutiles après la virgule (ex: 1.0 → 1)
  if (formattedValue.includes(decimalSeparator)) {
    formattedValue = formattedValue.replace(/(,|\.)0+$/, '');
  }

  const symbol = showSymbol ? ' Ar' : '';
  const space = useThinSpace ? '\u202F' : ' ';

  // Si suffixe non vide, ajouter un espace avant
  const suffixPart = suffix ? `${space}${suffix}` : '';

  return `${sign}${formattedValue}${suffixPart}${symbol}`;
};

/**
 * Formatte un montant en Ariary sans suffixe (K, M, Md)
 * Utile pour les PDF, exports, etc.
 */
export const formatMoneyFull = (amount: number): string => {
  if (!amount && amount !== 0) return '0 Ar';
  return amount.toLocaleString('fr-FR', {
    useGrouping: true,
    maximumFractionDigits: 0,
  }) + ' Ar';
};

/**
 * Formatte un montant en Ariary avec 2 décimales
 * Utile pour les prix unitaires
 */
export const formatMoneyWithDecimals = (amount: number): string => {
  if (!amount && amount !== 0) return '0,00 Ar';
  return amount.toLocaleString('fr-FR', {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' Ar';
};

/**
 * Formatte un montant en Ariary avec le signe +
 * Utile pour les entrées de stock
 */
export const formatMoneyWithSign = (amount: number): string => {
  if (!amount && amount !== 0) return '0 Ar';
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatMoney(Math.abs(amount))}`;
};

/**
 * Formate un montant en Ariary pour les graphiques
 * (court, sans le symbole Ar)
 */
export const formatMoneyShort = (amount: number): string => {
  if (!amount && amount !== 0) return '0';
  
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (absAmount >= 1_000_000_000) {
    return `${sign}${(absAmount / 1_000_000_000).toFixed(1)}Md`;
  }
  if (absAmount >= 1_000_000) {
    return `${sign}${(absAmount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `${sign}${(absAmount / 1_000).toFixed(0)}K`;
  }
  
  return `${sign}${absAmount}`;
};

// ⭐ EXPORT PAR DÉFAUT
export default {
  formatMoney,
  formatMoneyFull,
  formatMoneyWithDecimals,
  formatMoneyWithSign,
  formatMoneyShort,
};