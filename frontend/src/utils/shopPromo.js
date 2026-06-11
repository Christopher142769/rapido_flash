/**
 * État promo Shop — aligné sur backend/utils/shopPromo.js
 * Fiche publiée : promo active jusqu'à arrêt manuel (pas de coupure à endsAt).
 */
export const DEFAULT_BOOST_HOURS = 72;

export function getShopDeliveryFee(product, promoState) {
  if (promoState?.freeDelivery) return 0;
  return Math.max(0, Math.round(Number(product?.deliveryFee || 0)));
}

export function computeShopOrderTotals(unitPrice, quantity, deliveryFee) {
  const subtotalPrice = Math.round(Number(unitPrice || 0) * Number(quantity || 0));
  const fee = Math.max(0, Math.round(Number(deliveryFee || 0)));
  return { subtotalPrice, deliveryFee: fee, totalPrice: subtotalPrice + fee };
}

export function getShopPromoState(product, now = new Date()) {
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

/** Applique dates de boost + compteur (sans enregistrer). */
export function applyBoostDefaults(promo, hours = DEFAULT_BOOST_HOURS) {
  const h = Math.min(720, Math.max(1, Number(hours) || DEFAULT_BOOST_HOURS));
  const now = new Date();
  const end = new Date(now.getTime() + h * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const toLocal = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return {
    ...promo,
    active: true,
    runUntilStopped: promo.runUntilStopped !== false,
    startsAt: promo.startsAt || toLocal(now),
    endsAt: promo.endsAt || toLocal(end),
    boostHours: h,
  };
}

export function promoPayloadFromForm(promo) {
  const p = promo || {};
  const priceMode = p.priceMode === 'manual' ? 'manual' : 'percent';
  const manualRaw = p.manualPrice;
  const manualPrice =
    manualRaw === '' || manualRaw == null ? null : Math.max(0, Number(manualRaw));
  return {
    active: !!p.active,
    priceMode,
    discountPercent: Math.min(100, Math.max(0, Number(p.discountPercent) || 0)),
    manualPrice: Number.isFinite(manualPrice) ? manualPrice : null,
    freeDelivery: !!p.freeDelivery,
    startsAt: p.startsAt ? new Date(p.startsAt).toISOString() : null,
    endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : null,
    runUntilStopped: p.runUntilStopped !== false,
  };
}

export function formatPriceXof(amount) {
  const n = Math.round(Number(amount) || 0);
  return `CFA${n.toLocaleString('fr-FR')}`;
}

export function formatCountdown(ms) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

export function buildWhatsAppOrderUrl(product, promoState, quantity = 1) {
  const raw = String(product?.whatsappNumber || '').replace(/\D/g, '');
  if (!raw) return null;
  const price = promoState?.isPromoLive ? promoState.promoPrice : product.basePrice;
  const deliveryFee = getShopDeliveryFee(product, promoState);
  const { subtotalPrice, totalPrice } = computeShopOrderTotals(price, quantity, deliveryFee);
  const lines = [
    `Bonjour Rapido, je souhaite commander :`,
    `*${product.name}*`,
    `Quantité : ${quantity}`,
    `Prix unitaire : ${formatPriceXof(price)}`,
    `Sous-total : ${formatPriceXof(subtotalPrice)}`,
  ];
  if (promoState?.freeDelivery) {
    lines.push('Livraison gratuite (offre en cours)');
  } else if (deliveryFee > 0) {
    lines.push(`Frais de livraison : ${formatPriceXof(deliveryFee)}`);
  }
  lines.push(`*Total à payer : ${formatPriceXof(totalPrice)}*`);
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${raw}?text=${text}`;
}
