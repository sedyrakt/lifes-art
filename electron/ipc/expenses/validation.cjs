// ============================================================
// electron/ipc/expenses/validation.cjs
// ============================================================
function validateExpense(data) {
  const errors = [];
  const montant = Number(data.montant);
  if (!Number.isFinite(montant) || montant <= 0) errors.push('Le montant doit être un nombre positif');
  if (!data.categorie?.trim()) errors.push('La catégorie est obligatoire');
  if (data.categorie?.trim() && data.categorie.trim().length > 100) errors.push('La catégorie ne peut pas dépasser 100 caractères');
  if (data.description?.trim() && data.description.trim().length > 500) errors.push('La description ne peut pas dépasser 500 caractères');
  if (data.reference?.trim() && data.reference.trim().length > 50) errors.push('La référence ne peut pas dépasser 50 caractères');
  if (data.mode_paiement && data.mode_paiement.trim().length > 50) errors.push('Le mode de paiement ne peut pas dépasser 50 caractères');

  return {
    valid: errors.length === 0,
    errors,
    data: {
      categorie: data.categorie?.trim() || '',
      description: data.description?.trim() || '',
      montant,
      mode_paiement: data.mode_paiement?.trim() || 'Espèces',
      reference: data.reference?.trim() || '',
      observation: data.observation?.trim() || '',
      date_depense: data.date_depense || null,
      fournisseur_id: data.fournisseur_id || null,
      fournisseur_nom: data.fournisseur_nom || null,
    },
  };
}

module.exports = { validateExpense };