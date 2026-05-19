/**
 * Calcule le prix promo et l'état de la campagne express.
 */
function getShopPromoState(product, now = new Date()) {
  const promo = product?.promo || {};
  const basePrice = Number(product?.basePrice || 0);
  const discountPercent = Math.min(100, Math.max(0, Number(promo.discountPercent || 0)));

  const startsAt = promo.startsAt ? new Date(promo.startsAt) : null;
  const endsAt = promo.endsAt ? new Date(promo.endsAt) : null;
  const t = now.getTime();

  let isPromoLive = !!promo.active && discountPercent > 0;
  if (startsAt && t < startsAt.getTime()) isPromoLive = false;
  if (endsAt && t > endsAt.getTime()) isPromoLive = false;

  const promoPrice = isPromoLive
    ? Math.round(basePrice * (1 - discountPercent / 100))
    : basePrice;

  const timeRemainingMs =
    isPromoLive && endsAt ? Math.max(0, endsAt.getTime() - t) : 0;

  return {
    basePrice,
    promoPrice,
    discountPercent: isPromoLive ? discountPercent : 0,
    freeDelivery: isPromoLive && !!promo.freeDelivery,
    isPromoLive,
    promoEndsAt: endsAt ? endsAt.toISOString() : null,
    promoStartsAt: startsAt ? startsAt.toISOString() : null,
    timeRemainingMs,
  };
}

function serializeShopProduct(product, { publicView = false } = {}) {
  const doc = product.toObject ? product.toObject() : { ...product };
  const promoState = getShopPromoState(doc);
  const payload = {
    ...doc,
    ...promoState,
  };
  if (publicView && !doc.published) {
    return null;
  }
  return payload;
}

module.exports = { getShopPromoState, serializeShopProduct };
