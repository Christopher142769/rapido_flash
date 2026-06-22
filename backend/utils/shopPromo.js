const { getShopClosureState } = require('./shopClosure');

function getShopDeliveryFee(product, promoState) {
  if (promoState?.freeDelivery) return 0;
  return Math.max(0, Math.round(Number(product?.deliveryFee || 0)));
}

function computeShopOrderTotals(unitPrice, quantity, deliveryFee) {
  const subtotalPrice = Math.round(Number(unitPrice || 0) * Number(quantity || 0));
  const fee = Math.max(0, Math.round(Number(deliveryFee || 0)));
  return { subtotalPrice, deliveryFee: fee, totalPrice: subtotalPrice + fee };
}

/**
 * Calcule le prix promo et l'état de la campagne express.
 * Fiche publiée + promo active : la campagne reste live jusqu'à arrêt manuel
 * (endsAt sert au compte à rebours, pas à couper la page).
 */
function getShopPromoState(product, now = new Date()) {
  const promo = product?.promo || {};
  const published = !!product?.published;
  const basePrice = Number(product?.basePrice || 0);
  const priceMode = promo.priceMode === 'manual' ? 'manual' : 'percent';
  const discountPercent = Math.min(100, Math.max(0, Number(promo.discountPercent || 0)));
  const manualPrice = Number(promo.manualPrice);
  const hasManualPromo =
    priceMode === 'manual' &&
    Number.isFinite(manualPrice) &&
    manualPrice >= 0 &&
    basePrice > 0 &&
    manualPrice < basePrice;
  const hasPercentPromo = discountPercent > 0;
  const startsAt = promo.startsAt ? new Date(promo.startsAt) : null;
  const endsAt = promo.endsAt ? new Date(promo.endsAt) : null;
  const t = now.getTime();

  const runUntilStopped =
    promo.runUntilStopped === true ||
    (promo.runUntilStopped !== false &&
      published &&
      !!promo.active &&
      (hasManualPromo || hasPercentPromo));

  let isPromoLive = !!promo.active && (hasManualPromo || hasPercentPromo);
  if (startsAt && t < startsAt.getTime()) isPromoLive = false;
  if (endsAt && t > endsAt.getTime() && !runUntilStopped) isPromoLive = false;

  let countdownEndsAt = endsAt;
  if (isPromoLive && (!countdownEndsAt || countdownEndsAt.getTime() <= t)) {
    if (runUntilStopped || published) {
      countdownEndsAt = new Date(t + 48 * 3600 * 1000);
    }
  }

  let promoPrice = basePrice;
  if (isPromoLive) {
    promoPrice = hasManualPromo
      ? Math.round(manualPrice)
      : Math.round(basePrice * (1 - discountPercent / 100));
  }

  const effectiveDiscount =
    isPromoLive && basePrice > 0
      ? hasManualPromo
        ? Math.round((1 - promoPrice / basePrice) * 100)
        : discountPercent
      : 0;

  const timeRemainingMs =
    isPromoLive && countdownEndsAt ? Math.max(0, countdownEndsAt.getTime() - t) : 0;

  const freeDelivery = isPromoLive && !!promo.freeDelivery;
  const effectiveDeliveryFee = getShopDeliveryFee(product, { freeDelivery });

  return {
    basePrice,
    promoPrice,
    priceMode: isPromoLive ? priceMode : 'percent',
    manualPrice: hasManualPromo ? Math.round(manualPrice) : null,
    discountPercent: effectiveDiscount,
    freeDelivery,
    deliveryFee: Number(product?.deliveryFee || 0),
    effectiveDeliveryFee,
    isPromoLive,
    runUntilStopped,
    promoEndsAt: countdownEndsAt ? countdownEndsAt.toISOString() : null,
    promoStartsAt: startsAt ? startsAt.toISOString() : null,
    timeRemainingMs,
  };
}

function serializeShopProduct(product, { publicView = false } = {}) {
  const doc = product.toObject ? product.toObject() : { ...product };
  const promoState = getShopPromoState(doc);
  const closureState = getShopClosureState(doc);
  const payload = {
    ...doc,
    ...promoState,
    ...closureState,
  };
  if (publicView && !doc.published) {
    return null;
  }
  return payload;
}

module.exports = {
  getShopPromoState,
  serializeShopProduct,
  getShopDeliveryFee,
  computeShopOrderTotals,
};
