/**
 * Annule une confirmation faite par erreur (confirmée → en attente).
 * Autorisé uniquement tant que la commande n’est pas passée en préparation.
 */
function unconfirmShopOrder(order) {
  if (!order) return 'Commande introuvable';
  if (order.statut === 'livree' || order.commercialStatus === 'livree') {
    return 'Une commande livrée ne peut pas être déconfirmée';
  }
  if (order.statut === 'annulee' || order.commercialStatus === 'annulee') {
    return 'Cette commande est annulée';
  }
  if (order.statut !== 'confirmee') {
    return 'Seule une commande confirmée (pas encore en préparation) peut être déconfirmée';
  }

  order.statut = 'en_attente';
  order.commercialStatus = 'commande';
  order.confirmedAt = null;
  order.scheduledDeliveryAt = null;
  order.relanceNotifiedAt = null;
  return null;
}

module.exports = {
  unconfirmShopOrder,
};
