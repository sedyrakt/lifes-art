// electron/services/auth.service.cjs - SYNCHRONOUS
const bcrypt = require('bcryptjs');

// ⭐ FANITSARA: Hardcoded ny SALT_ROUNDS mba tsy hiankina amin'ny process.env
const SALT_ROUNDS = 12;

const hashPassword = (password) => {
  return bcrypt.hashSync(password, SALT_ROUNDS);
};

const hashPasswordAsync = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
};

const verifyPassword = (password, hashedPassword) => {
  if (!hashedPassword || typeof hashedPassword !== 'string' || hashedPassword.length !== 60) {
    return false;
  }
  try {
    return bcrypt.compareSync(password, hashedPassword);
  } catch (error) {
    console.error('❌ Erreur verifyPassword:', error.message);
    return false;
  }
};

module.exports = {
  hashPassword,        // sync
  hashPasswordAsync,   // async (ho an'ny compatibilité)
  verifyPassword,      // sync
  SALT_ROUNDS,
};