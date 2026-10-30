// ============================================================
// electron/ipc/stock/events.cjs
const { BrowserWindow } = require('electron');
const { log, error } = require('../../database/utils.cjs');

function emitMouvementAdded(mouvementData = {}) {
  try {
    const windows = BrowserWindow.getAllWindows();

    if (!windows.length) {
      log('⚠️ [stock/events] Aucune fenêtre trouvée');
      return false;
    }

    const productEvent = {
      type: 'stock_update',
      produit_id: mouvementData.produit_id ?? null,
      quantite: mouvementData.quantite ?? 0,
      type_mouvement: mouvementData.type_mouvement ?? null,
      nouveau_stock: mouvementData.nouveau_stock ?? null,
      timestamp: new Date().toISOString(),
    };

    const dashboardEvent = {
      type: 'stock_update',
      produit_id: mouvementData.produit_id ?? null,
      timestamp: new Date().toISOString(),
    };

    let emitted = 0;

    for (const win of windows) {
      if (!win || win.isDestroyed()) {
        continue;
      }

      try {
        win.webContents.send(
          'stock:mouvement-added',
          mouvementData
        );

        win.webContents.send(
          'products:changed',
          productEvent
        );

        win.webContents.send(
          'dashboard:changed',
          dashboardEvent
        );

        emitted++;
      } catch (err) {
        error(
          '❌ [stock/events] Erreur émission fenêtre:',
          err.message
        );
      }
    }

    log(
      `📡 [stock/events] Events envoyés à ${emitted}/${windows.length} fenêtre(s)`
    );

    return emitted > 0;
  } catch (err) {
    error(
      '❌ [stock/events] Erreur globale:',
      err.message
    );

    return false;
  }
}

module.exports = {
  emitMouvementAdded,
};