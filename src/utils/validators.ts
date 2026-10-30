// ============================================================
// src/utils/validators.ts - FANAMARINANA (VALIDATORS)
// ⭐ FANITSARA: validateEmail, validateNotEmpty, validatePassword, sns.
// ============================================================

/**
 * Manamarina raha misy atiny ny saha iray
 * @param value - Ny sanda tiana hojerena
 * @returns {boolean} - True raha misy atiny (tsia banga na espace fotsiny)
 */
export const validateNotEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

/**
 * Manamarina raha email manan-kery
 * @param email - Ny adiresy email tiana hojerena
 * @returns {boolean} - True raha email manan-kery
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  // Regex tsotra nefa mahomby ho an'ny email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
};

/**
 * Manamarina ny herin'ny password
 * @param password - Ny password tiana hojerena
 * @returns {{ valid: boolean; message: string; trimmed?: string }}
 */
export const validatePassword = (password: string): { valid: boolean; message: string; trimmed?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Le mot de passe est requis' };
  }
  const trimmed = password.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Le mot de passe ne peut pas être vide' };
  }
  if (trimmed.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  // Safidy: manamarina raha misy majuscule, minuscule, chiffre, symbole
  // Tsy atao obligatoire fa soso-kevitra fotsiny
  let strength = 0;
  if (/[a-z]/.test(trimmed)) strength++;
  if (/[A-Z]/.test(trimmed)) strength++;
  if (/[0-9]/.test(trimmed)) strength++;
  if (/[^a-zA-Z0-9]/.test(trimmed)) strength++;

  let message = 'Mot de passe valide';
  if (strength <= 1) message = 'Mot de passe faible (ajoutez des majuscules, chiffres ou symboles)';
  else if (strength === 2) message = 'Mot de passe moyen';
  else if (strength >= 3) message = 'Mot de passe fort';

  return { valid: true, message, trimmed };
};

/**
 * Manamarina raha mitovy ny password sy ny confirmation
 * @param password - Ny password
 * @param confirmPassword - Ny confirmation
 * @returns {boolean} - True raha mitovy
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  if (!password || !confirmPassword) return false;
  return password === confirmPassword;
};

/**
 * Manamarina raha misy tarehimarika fotsiny ny saha (ohatra: téléphone)
 * @param value - Ny sanda tiana hojerena
 * @returns {boolean} - True raha tarehimarika fotsiny
 */
export const validateNumeric = (value: string): boolean => {
  if (!value) return true; // Avela banga (optionnel)
  return /^[0-9+\-\s()]+$/.test(value);
};

/**
 * Manamarina ny halavan'ny lahatsoratra
 * @param value - Ny sanda tiana hojerena
 * @param min - Halava farafahakeliny (tsy voatery)
 * @param max - Halava farany (tsy voatery)
 * @returns {boolean} - True raha ao anatin'ny fetra
 */
export const validateLength = (value: string, min?: number, max?: number): boolean => {
  if (!value && !min) return true;
  if (!value && min) return false;
  const length = value.trim().length;
  if (min !== undefined && length < min) return false;
  if (max !== undefined && length > max) return false;
  return true;
};