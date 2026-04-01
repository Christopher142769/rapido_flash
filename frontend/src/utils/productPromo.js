/** Pourcentage promo valide (1–90) ou null */
export function promoPourcentageValue(produit) {
  if (!produit) return null;
  const v = produit.promoPourcentage;
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n) || n <= 0) return null;
  return Math.min(90, Math.max(1, Math.round(n)));
}

export function hasPricePromo(produit) {
  return promoPourcentageValue(produit) != null;
}

export function hasFreeDeliveryPromo(produit) {
  return !!produit?.promoLivraisonGratuite;
}

/** Prix à payer (avec réduction % si promo active) */
export function effectiveProductPrice(produit) {
  if (!produit || produit.prix == null) return 0;
  const pct = promoPourcentageValue(produit);
  if (pct == null) return Number(produit.prix);
  return Math.round(Number(produit.prix) * (1 - pct / 100));
}
