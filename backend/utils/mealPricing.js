/**
 * Prix / promo / accompagnements Shop Repas.
 * Réutilise getShopPromoState (même shape promo que Shop Express).
 */
const { getShopPromoState } = require('./shopPromo');

function normalizeAccompagnements(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => ({
      name: String(a?.name || '').trim(),
      price: Math.max(0, Math.round(Number(a?.price) || 0)),
      required: !!a?.required,
      maxQuantity: Math.min(99, Math.max(1, Number(a?.maxQuantity) || 10)),
      _id: a?._id ? String(a._id) : undefined,
    }))
    .filter((a) => a.name);
}

function getMealUnitPrice(product, now = new Date()) {
  const promoState = getShopPromoState(product, now);
  return {
    promoState,
    unitPrice: promoState.isPromoLive ? promoState.promoPrice : promoState.basePrice,
  };
}

/**
 * Valide et calcule une ligne panier côté serveur.
 * @param {object} product MealProduct doc
 * @param {{ quantity: number, accompagnements?: { id?: string, name?: string, quantity: number }[] }} line
 */
function buildMealOrderLine(product, line) {
  const quantity = Math.max(1, Math.round(Number(line?.quantity) || 0));
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: 'Quantité invalide' };
  }

  const { promoState, unitPrice } = getMealUnitPrice(product);
  const catalog = product.accompagnements || [];
  const selected = Array.isArray(line?.accompagnements) ? line.accompagnements : [];

  const requiredOnes = catalog.filter((a) => a.required);
  for (const req of requiredOnes) {
    const pick = selected.find(
      (s) =>
        (s.id && String(s.id) === String(req._id)) ||
        String(s.name || '').trim().toLowerCase() === String(req.name).trim().toLowerCase()
    );
    const qty = Math.round(Number(pick?.quantity) || 0);
    if (qty < 1) {
      return { error: `Accompagnement requis : ${req.name}` };
    }
  }

  const accompagnements = [];
  let accTotal = 0;

  for (const s of selected) {
    const qty = Math.round(Number(s.quantity) || 0);
    if (qty < 1) continue;
    const match = catalog.find(
      (a) =>
        (s.id && String(s.id) === String(a._id)) ||
        String(s.name || '').trim().toLowerCase() === String(a.name).trim().toLowerCase()
    );
    if (!match) {
      return { error: `Accompagnement inconnu : ${s.name || s.id}` };
    }
    const maxQ = Math.min(99, Math.max(1, Number(match.maxQuantity) || 10));
    const safeQty = Math.min(maxQ, qty);
    const price = Math.max(0, Math.round(Number(match.price) || 0));
    accompagnements.push({
      accompagnementId: String(match._id || ''),
      name: match.name,
      price,
      quantity: safeQty,
    });
    accTotal += price * safeQty;
  }

  if (catalog.length > 0 && accompagnements.length === 0) {
    return { error: 'Choisissez au moins un accompagnement pour ce plat' };
  }

  const lineTotal = Math.round(unitPrice * quantity + accTotal);

  return {
    item: {
      mealProduct: product._id,
      productName: product.name,
      slug: product.slug,
      quantity,
      unitPrice,
      basePrice: promoState.basePrice,
      isPromoLive: promoState.isPromoLive,
      discountPercent: promoState.discountPercent,
      accompagnements,
      lineTotal,
    },
    promoState,
  };
}

function computeMealOrderTotals(items, deliveryFee, freeDelivery = false) {
  const subtotalPrice = items.reduce((sum, it) => sum + Math.round(Number(it.lineTotal) || 0), 0);
  const fee = freeDelivery ? 0 : Math.max(0, Math.round(Number(deliveryFee) || 0));
  return {
    subtotalPrice,
    deliveryFee: fee,
    totalPrice: subtotalPrice + fee,
  };
}

function serializeMealProduct(product) {
  const doc = product.toObject ? product.toObject() : { ...product };
  const promoState = getShopPromoState(doc);
  return {
    ...doc,
    ...promoState,
    accompagnements: normalizeAccompagnements(doc.accompagnements),
  };
}

module.exports = {
  normalizeAccompagnements,
  getMealUnitPrice,
  buildMealOrderLine,
  computeMealOrderTotals,
  serializeMealProduct,
};
