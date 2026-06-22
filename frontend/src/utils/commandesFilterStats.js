/** Somme des quantités commandées Shop (filtrées). */
export function sumShopOrdersQuantity(orders) {
  return (orders || []).reduce((sum, order) => {
    const q = Number(order.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
}

/** Somme des quantités (plats + produits) pour commandes restaurant. */
export function sumRestaurantCommandesQuantity(commandes) {
  return (commandes || []).reduce((sum, commande) => {
    let q = 0;
    for (const item of commande.plats || []) {
      const n = Number(item.quantite);
      if (Number.isFinite(n) && n > 0) q += n;
    }
    for (const item of commande.produits || []) {
      const n = Number(item.quantite);
      if (Number.isFinite(n) && n > 0) q += n;
    }
    return sum + q;
  }, 0);
}

export function formatFilterQuantity(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v % 1 === 0 ? v.toLocaleString('fr-FR') : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}
