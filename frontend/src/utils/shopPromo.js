export function getShopPromoState(product, now = new Date()) {
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
    promoEndsAt: endsAt,
    timeRemainingMs,
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
  const total = price * quantity;
  const lines = [
    `Bonjour Rapido, je souhaite commander :`,
    `*${product.name}*`,
    `Quantité : ${quantity}`,
    `Prix unitaire : ${formatPriceXof(price)}`,
    `Total : ${formatPriceXof(total)}`,
  ];
  if (promoState?.freeDelivery) lines.push('Livraison gratuite (offre en cours)');
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${raw}?text=${text}`;
}
