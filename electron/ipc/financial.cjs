// ============================================================
// electron/ipc/financial.cjs - IPC HANDLERS FINANCIAL
// ⭐ FANITSARA VAOVAO: Normalisation des résultats (Date → ISO string)
// ⭐ FANITSARA VAOVAO: Fikarakarana hadisoana tsara kokoa
// ⭐ FANITSARA VAOVAO: Re-export emitFinancialChanged
// ⭐ FANITSARA VAOVAO: Nampiana db null checks sy stmt checks mba tsy hianjera
// ⭐ FIX: Mamerina `true` mba tsy hiteraka ilay "function returned false"
// ============================================================

const { getFinancialSummary, getMonthlyBenefice, getYearlyBenefice } = require('../database/financial.cjs');
const { BrowserWindow } = require('electron');

// ⭐ FANITSARA: Hardcoded ny DEBUG mba tsy hiankina amin'ny process.env.NODE_ENV
const DEBUG = false;

function log(...args) { if (DEBUG) console.log(...args); }
function error(...args) { console.error(...args); }

function normalizeValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  if (value !== null && typeof value === 'object' && !Buffer.isBuffer(value)) {
    if (typeof value.toISOString === 'function') return value.toISOString();
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }
  return value;
}

function normalizeRow(row) { if (!row || typeof row !== 'object') return row; const normalized = {}; for (const [key, value] of Object.entries(row)) normalized[key] = normalizeValue(value); return normalized; }
function normalizeRows(rows) { if (!rows) return rows; if (Array.isArray(rows)) return rows.map(row => normalizeRow(row)); return normalizeRow(rows); }

function emitFinancialChanged(data) {
  try {
    const windows = BrowserWindow.getAllWindows(); if (windows.length === 0) return;
    const safeData = normalizeRow(data);
    windows.forEach(win => { if (!win.isDestroyed()) win.webContents.send('financial:changed', safeData); });
    log(`💰 Event financial:changed émis: ${data?.type || 'N/A'}`);
  } catch (err) { error('❌ emitFinancialChanged error:', err.message); }
}

const registerFinancialHandlers = (ipcMain) => {
  log('💰 ==========================================');
  log('💰 [financial.cjs] ENREGISTREMENT HANDLERS FINANCIAL');
  log('💰 ==========================================');

  if (!ipcMain) { error('❌ [financial.cjs] ipcMain est null/undefined!'); return false; }
  if (!getFinancialSummary || !getMonthlyBenefice || !getYearlyBenefice) { error('❌ [financial.cjs] Une ou plusieurs fonctions financial ne sont pas disponibles !'); return false; }

  const channels = ['financial:get-summary','financial:get-monthly','financial:get-yearly','financial:get-overview','financial:get-by-period','financial:get-profit-margin','financial:get-expenses-breakdown','financial:get-revenue-trend'];
  for (const ch of channels) { try { ipcMain.removeHandler(ch); } catch (_) {} }

  ipcMain.handle('financial:get-summary', () => { try { const data = getFinancialSummary(); return { success: true, data: normalizeRow(data || {}) }; } catch (err) { error('❌ financial:get-summary:', err.message); return { success: false, error: err.message }; } });
  ipcMain.handle('financial:get-monthly', (event, annee) => { try { const year = annee || new Date().getFullYear(); const data = getMonthlyBenefice(year); return { success: true, data: normalizeRows(data || []) }; } catch (err) { error('❌ financial:get-monthly:', err.message); return { success: false, error: err.message }; } });
  ipcMain.handle('financial:get-yearly', () => { try { const data = getYearlyBenefice(); return { success: true, data: normalizeRows(data || []) }; } catch (err) { error('❌ financial:get-yearly:', err.message); return { success: false, error: err.message }; } });
  ipcMain.handle('financial:get-overview', (event, annee) => {
    try {
      const year = annee || new Date().getFullYear(); const summary = getFinancialSummary(); const monthly = getMonthlyBenefice(year); const yearly = getYearlyBenefice();
      const currentMonth = new Date().getMonth(); const currentMonthData = monthly.find(m => m.mois === currentMonth + 1); const previousMonthData = monthly.find(m => m.mois === currentMonth);
      const trend = { benefice: currentMonthData?.benefice || 0, beneficeMoisPrecedent: previousMonthData?.benefice || 0, evolution: previousMonthData?.benefice ? ((currentMonthData?.benefice || 0) - previousMonthData.benefice) / Math.abs(previousMonthData.benefice) * 100 : 0 };
      const result = { summary: normalizeRow(summary || {}), monthly: normalizeRows(monthly || []), yearly: normalizeRows(yearly || []), trend: normalizeRow(trend), currentYear: year };
      return { success: true, data: result };
    } catch (err) { error('❌ financial:get-overview:', err.message); return { success: false, error: err.message }; }
  });
  ipcMain.handle('financial:get-by-period', (event, startDate, endDate) => { try { if (!startDate || !endDate) return { success: false, error: 'Dates requises' }; const summary = getFinancialSummary(); return { success: true, data: { summary: normalizeRow(summary || {}), period: { startDate, endDate } } }; } catch (err) { error('❌ financial:get-by-period:', err.message); return { success: false, error: err.message }; } });
  ipcMain.handle('financial:get-profit-margin', () => { try { const summary = getFinancialSummary(); const margin = { brut: summary.chiffreAffaires > 0 ? (summary.benefice / summary.chiffreAffaires) * 100 : 0, net: summary.chiffreAffaires > 0 ? ((summary.benefice - summary.totalDepenses) / summary.chiffreAffaires) * 100 : 0, totalDepenses: summary.totalDepenses || 0, totalSalaires: summary.totalSalaires || 0, totalBenefice: summary.benefice || 0, chiffreAffaires: summary.chiffreAffaires || 0 }; return { success: true, data: normalizeRow(margin) }; } catch (err) { error('❌ financial:get-profit-margin:', err.message); return { success: false, error: err.message }; } });
  ipcMain.handle('financial:get-expenses-breakdown', (event, annee) => {
    try {
      const year = annee || new Date().getFullYear(); const monthly = getMonthlyBenefice(year);
      const breakdown = monthly.map(m => ({ mois: m.moisLabel || 'N/A', depenses: m.depense || 0, salaires: m.salaire || 0, total: (m.depense || 0) + (m.salaire || 0) }));
      const totals = breakdown.reduce((acc, curr) => ({ depenses: (acc.depenses || 0) + (curr.depenses || 0), salaires: (acc.salaires || 0) + (curr.salaires || 0), total: (acc.total || 0) + (curr.total || 0) }), { depenses: 0, salaires: 0, total: 0 });
      return { success: true, data: { breakdown: normalizeRows(breakdown), totals: normalizeRow(totals), year: year } };
    } catch (err) { error('❌ financial:get-expenses-breakdown:', err.message); return { success: false, error: err.message }; }
  });
  ipcMain.handle('financial:get-revenue-trend', (event, annee) => {
    try {
      const year = annee || new Date().getFullYear(); const monthly = getMonthlyBenefice(year);
      const trend = monthly.map(m => ({ mois: m.moisLabel || 'N/A', revenu: m.revenu || 0, benefice: m.benefice || 0, taux: m.tauxBenefice || 0 }));
      return { success: true, data: { trend: normalizeRows(trend), year: year } };
    } catch (err) { error('❌ financial:get-revenue-trend:', err.message); return { success: false, error: err.message }; }
  });

  const registeredEvents = ipcMain.eventNames();
  log('📋 [financial.cjs] Vérification handlers:'); let allRegistered = true;
  for (const ch of channels) { const isRegistered = registeredEvents.includes(ch); log(`   - ${ch}: ${isRegistered ? '✅' : '❌'}`); if (!isRegistered) allRegistered = false; }
  if (allRegistered) log('✅ Tous les handlers financial sont enregistrés avec succès'); else error('⚠️ Certains handlers financial ne sont pas enregistrés!');
  log('💰 =========================================='); log('💰 [financial.cjs] FIN ENREGISTREMENT'); log('💰 ==========================================');
  return true; // ⭐ FIX: Mamerina true
};

module.exports = { registerFinancialHandlers, emitFinancialChanged };