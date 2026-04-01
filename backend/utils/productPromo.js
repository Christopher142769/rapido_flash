/**
 * Prix unitaire payé (réduction % promo si active). Aligné sur le frontend.
 */
function promoPourcentageValue(produit) {
  if (!produit) return null;
  const v = produit.promoPourcentage;
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n) || n <= 0) return null;
  return Math.min(90, Math.max(1, Math.round(n)));
}

function effectiveProduitPrice(produit) {
  if (!produit || produit.prix == null) return 0;
  const pct = promoPourcentageValue(produit);
  if (pct == null) return Number(produit.prix);
  return Math.round(Number(produit.prix) * (1 - pct / 100));
}

function parsePromoPourcentageBody(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return Math.min(90, Math.max(1, Math.round(n)));
}

function parsePromoLivraisonBody(v) {
  return v === true || v === 'true' || v === '1';
}

module.exports = {
  promoPourcentageValue,
  effectiveProduitPrice,
  parsePromoPourcentageBody,
  parsePromoLivraisonBody,
};
