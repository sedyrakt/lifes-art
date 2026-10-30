// ============================================================
// electron/services/license.service.cjs - ENTRY POINT
// ⭐ Re-export avy amin'ny license/index.cjs (CommonJS)
// ============================================================

const licenseModule = require('./license/index.cjs');

// Re-export rehetra
module.exports = licenseModule;

console.log('✅ license.service.cjs - Chargé (CommonJS)');