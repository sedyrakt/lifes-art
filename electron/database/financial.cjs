// ============================================================
// database/financial.cjs - FINANCIAL (CommonJS)
// ⭐ FIX: Ovay ny table `paiements` -> `paiements_employes`
// ============================================================

const { getDb } = require('./connection.cjs');
const { error } = require('./utils.cjs');

const getFinancialSummary = async () => {
  try {
    const currentDb = getDb();
    if (!currentDb) throw new Error('Base de données non disponible');

    const caStmt = currentDb.prepare(`SELECT COALESCE(SUM(total_ttc), 0) as total FROM commandes WHERE statut IN ('Livrée', 'Confirmée')`);
    const caResult = caStmt.get();
    const chiffreAffaires = Number(caResult?.total || 0);

    const depensesStmt = currentDb.prepare(`SELECT COALESCE(SUM(montant), 0) as total FROM depenses`);
    const depensesResult = depensesStmt.get();
    const totalDepenses = Number(depensesResult?.total || 0);

    // ⭐ FIX: Ovay ny table
    const salairesStmt = currentDb.prepare(`SELECT COALESCE(SUM(montant), 0) as total FROM paiements_employes`);
    const salairesResult = salairesStmt.get();
    const totalSalaires = Number(salairesResult?.total || 0);

    const benefice = chiffreAffaires - totalDepenses - totalSalaires;
    return { chiffreAffaires, totalDepenses, totalSalaires, benefice, tauxBenefice: chiffreAffaires > 0 ? parseFloat(((benefice / chiffreAffaires) * 100).toFixed(2)) : 0, dateCalcul: new Date().toISOString() };
  } catch (err) { error('❌ Erreur getFinancialSummary:', err); return { chiffreAffaires: 0, totalDepenses: 0, totalSalaires: 0, benefice: 0, tauxBenefice: 0, dateCalcul: new Date().toISOString(), error: err.message }; }
};

const getMonthlyBenefice = async (annee) => {
  try {
    const year = annee || new Date().getFullYear();
    const currentDb = getDb();
    if (!currentDb) return [];

    const revenusStmt = currentDb.prepare(`SELECT strftime('%m', date_commande) as mois, COALESCE(SUM(total_ttc), 0) as total FROM commandes WHERE statut IN ('Livrée', 'Confirmée') AND strftime('%Y', date_commande) = ? GROUP BY strftime('%m', date_commande)`);
    const revenus = revenusStmt.all(String(year));
    
    const depensesStmt = currentDb.prepare(`SELECT strftime('%m', date_depense) as mois, COALESCE(SUM(montant), 0) as total FROM depenses WHERE strftime('%Y', date_depense) = ? GROUP BY strftime('%m', date_depense)`);
    const depenses = depensesStmt.all(String(year));
    
    // ⭐ FIX: Ovay ny table
    const salairesStmt = currentDb.prepare(`SELECT strftime('%m', date_paiement) as mois, COALESCE(SUM(montant), 0) as total FROM paiements_employes WHERE strftime('%Y', date_paiement) = ? GROUP BY strftime('%m', date_paiement)`);
    const salaires = salairesStmt.all(String(year));

    const mois = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const result = mois.map(m => {
      const revenu = Number(revenus.find(r => r.mois === m)?.total || 0);
      const depense = Number(depenses.find(d => d.mois === m)?.total || 0);
      const salaire = Number(salaires.find(s => s.mois === m)?.total || 0);
      return { mois: parseInt(m), moisLabel: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][parseInt(m) - 1], revenu, depense, salaire, benefice: revenu - depense - salaire, tauxBenefice: revenu > 0 ? parseFloat(((revenu - depense - salaire) / revenu * 100).toFixed(2)) : 0 };
    });
    return result;
  } catch (err) { error('❌ Erreur getMonthlyBenefice:', err); return []; }
};

const getYearlyBenefice = async () => {
  try {
    const currentDb = getDb();
    if (!currentDb) return [];

    const revenusStmt = currentDb.prepare(`SELECT strftime('%Y', date_commande) as annee, COALESCE(SUM(total_ttc), 0) as revenu FROM commandes WHERE statut IN ('Livrée', 'Confirmée') GROUP BY strftime('%Y', date_commande) ORDER BY annee`);
    const revenus = revenusStmt.all();
    
    const result = await Promise.all(revenus.map(async (r) => {
      const annee = r.annee;
      const depStmt = currentDb.prepare(`SELECT COALESCE(SUM(montant), 0) as total FROM depenses WHERE strftime('%Y', date_depense) = ?`);
      const depResult = depStmt.get(annee);
      
      // ⭐ FIX: Ovay ny table
      const salStmt = currentDb.prepare(`SELECT COALESCE(SUM(montant), 0) as total FROM paiements_employes WHERE strftime('%Y', date_paiement) = ?`);
      const salResult = salStmt.get(annee);
      
      const revenu = Number(r.revenu || 0);
      const depense = Number(depResult?.total || 0);
      const salaire = Number(salResult?.total || 0);
      return { annee: parseInt(annee), revenu, depense, salaire, benefice: revenu - depense - salaire, tauxBenefice: revenu > 0 ? parseFloat(((revenu - depense - salaire) / revenu * 100).toFixed(2)) : 0 };
    }));
    return result;
  } catch (err) { error('❌ Erreur getYearlyBenefice:', err); return []; }
};

module.exports = { getFinancialSummary, getMonthlyBenefice, getYearlyBenefice };