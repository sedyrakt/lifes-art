// ============================================================
// electron/utils/validator.cjs - FANAMARINANA HO AN'NY BACKEND
// ⭐ VALIDATION DES DONNÉES
// ⭐ PAS DE MOT DE PASSE OBLIGATOIRE MAJUSCULE/SYMBOLE
// ============================================================

/**
 * Valide un email
 * @param {string} email - Email à valider
 * @returns {boolean} true si valide
 */
const validateEmail = (email) => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

/**
 * Valide un numéro de téléphone
 * @param {string} phone - Téléphone à valider
 * @returns {boolean} true si valide
 */
const validatePhone = (phone) => {
  if (!phone) return true; // Optionnel
  const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  return re.test(phone.trim());
};

/**
 * Valide qu'une valeur n'est pas vide
 * @param {*} value - Valeur à vérifier
 * @returns {boolean} true si non vide
 */
const validateNotEmpty = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

/**
 * Valide la longueur d'une chaîne
 * @param {string} value - Chaîne à vérifier
 * @param {number} min - Longueur minimale
 * @param {number} max - Longueur maximale
 * @returns {boolean} true si la longueur est dans l'intervalle
 */
const validateLength = (value, min, max) => {
  if (!value) return false;
  const length = value.length;
  return length >= min && length <= max;
};

/**
 * Valide qu'une valeur est un nombre
 * @param {*} value - Valeur à vérifier
 * @param {number} min - Valeur minimale
 * @param {number} max - Valeur maximale
 * @returns {boolean} true si c'est un nombre valide
 */
const validateNumber = (value, min = 0, max = Infinity) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Nettoie une entrée (supprime les caractères dangereux)
 * @param {string} input - Chaîne à nettoyer
 * @returns {string} Chaîne nettoyée
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/['"\\;<>]/g, '').trim();
  }
  return input;
};

/**
 * ⭐ Valide un mot de passe (sans exigence de majuscule/symbole)
 * @param {string} password - Mot de passe à valider
 * @returns {Object} { valid: boolean, message: string }
 */
const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: 'Le mot de passe est requis' };
  }
  
  const trimmed = password.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Le mot de passe ne peut pas être vide' };
  }
  
  if (trimmed.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  
  // ⭐ Majuscule: optionnel (pas obligatoire)
  // ⭐ Symbole: optionnel (pas obligatoire)
  // ⭐ Au moins un chiffre: optionnel
  // Seul le minimum de 8 caractères est obligatoire
  
  return { valid: true, message: '✅ Mot de passe valide' };
};

/**
 * ⭐ Valide un mot de passe avec exigence de majuscule et symbole (pour les comptes admin)
 * @param {string} password - Mot de passe à valider
 * @param {boolean} strict - Si true, exige majuscule et symbole
 * @returns {Object} { valid: boolean, message: string }
 */
const validatePasswordStrict = (password, strict = false) => {
  if (!password) {
    return { valid: false, message: 'Le mot de passe est requis' };
  }
  
  const trimmed = password.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Le mot de passe ne peut pas être vide' };
  }
  
  if (trimmed.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  
  if (strict) {
    if (!/[A-Z]/.test(trimmed)) {
      return { valid: false, message: 'Au moins une majuscule requise' };
    }
    if (!/[a-z]/.test(trimmed)) {
      return { valid: false, message: 'Au moins une minuscule requise' };
    }
    if (!/[0-9]/.test(trimmed)) {
      return { valid: false, message: 'Au moins un chiffre requis' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(trimmed)) {
      return { valid: false, message: 'Au moins un symbole requis' };
    }
  }
  
  return { valid: true, message: '✅ Mot de passe valide', trimmed };
};

module.exports = {
  validateEmail,
  validatePhone,
  validateNotEmpty,
  validateLength,
  validateNumber,
  sanitizeInput,
  validatePassword,
  validatePasswordStrict,
};