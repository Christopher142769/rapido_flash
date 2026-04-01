/** Aligné sur le backend : au moins une ligne produit avec promo livraison → frais = 0 */
export function cartQualifiesFreeDeliveryPromo(cart) {
  return (cart || []).some((item) => item.productId != null && item.promoLivraisonGratuite);
}
