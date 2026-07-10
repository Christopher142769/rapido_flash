const { getShopClosureState } = require('./shopClosure');
const {
  countTodayOrdersForProduct,
  getShopOrderLimitState,
  mergeClosureWithOrderLimit,
} = require('./shopOrderLimit');

const { computeEviscerationFee, isEviscerationApplicable } = require('./shopEvisceration');

const DEFAULT_COUNTDOWN_HOURS = 48;

/**
 * Fin de compte à rebours stable : ne se réinitialise pas au refresh.
 * Si endsAt est passé mais la promo continue (runUntilStopped), on avance
 * par fenêtres fixes depuis l'ancre d'origine (temps réel écoulé).
 */
function resolveStableCountdownEndsAt({
  endsAt,
  startsAt,
  anchorAt,
  nowMs,
  durationHours = DEFAULT_COUNTDOWN_HOURS,
  allowRolling = false,
}) {
  const durationMs =
    Math.min(720, Math.max(1, Number(durationHours) || DEFAULT_COUNTDOWN_HOURS)) * 3600 * 1000;
  const t = Number(nowMs) || Date.now();

  if (endsAt && endsAt.getTime() > t) {
    return endsAt;
  }

  if (!allowRolling) {
    return endsAt || null;
  }

  const rollFrom = endsAt || startsAt || (anchorAt ? new Date(anchorAt) : null);
  if (!rollFrom || !Number.isFinite(rollFrom.getTime())) {
    return null;
  }

  let endMs = rollFrom.getTime();
  if (endsAt) {
    if (endMs <= t) {
      const cycles = Math.floor((t - endMs) / durationMs) + 1;
      endMs += cycles * durationMs;
    }
  } else {
    const elapsed = Math.max(0, t - endMs);
    const cycleIndex = Math.floor(elapsed / durationMs);
    endMs = endMs + (cycleIndex + 1) * durationMs;
  }

  return new Date(endMs);
}

function getShopDeliveryFee(product, promoState) {
  if (promoState?.freeDelivery) return 0;
  return Math.max(0, Math.round(Number(product?.deliveryFee || 0)));
}

function computeShopOrderTotals(unitPrice, quantity, deliveryFee, options = {}) {
  const { eviscerationCleaning = false, quantityUnit = 'unit' } = options;
  const subtotalPrice = Math.round(Number(unitPrice || 0) * Number(quantity || 0));
  const fee = Math.max(0, Math.round(Number(deliveryFee || 0)));
  const eviscerationFee = computeEviscerationFee(quantity, quantityUnit, eviscerationCleaning);
  return {
    subtotalPrice,
    deliveryFee: fee,
    eviscerationCleaning: !!eviscerationCleaning && eviscerationFee > 0,
    eviscerationFee,
    totalPrice: subtotalPrice + fee + eviscerationFee,
  };
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

  const countdownEndsAt = isPromoLive
    ? resolveStableCountdownEndsAt({
        endsAt,
        startsAt,
        anchorAt: product?.createdAt || product?.updatedAt || null,
        nowMs: t,
        durationHours: Number(promo.boostHours) || DEFAULT_COUNTDOWN_HOURS,
        allowRolling: runUntilStopped || published,
      })
    : endsAt;

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

async function serializeShopProduct(product, { publicView = false, includeOrderCount = true } = {}) {
  const doc = product.toObject ? product.toObject() : { ...product };
  const promoState = getShopPromoState(doc);
  const closureState = getShopClosureState(doc);
  const now = new Date();

  let ordersToday = 0;
  const productId = doc._id || product._id;
  if (includeOrderCount && productId) {
    ordersToday = await countTodayOrdersForProduct(productId);
  }

  const limitState = getShopOrderLimitState(doc, ordersToday);
  const availability = mergeClosureWithOrderLimit(closureState, limitState, now);

  const payload = {
    ...doc,
    ...promoState,
    ...availability,
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
