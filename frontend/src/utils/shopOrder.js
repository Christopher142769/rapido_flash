import { computeShopOrderTotals, formatPriceXof, getShopDeliveryFee } from './shopPromo';
import { isValidShopCity } from './shopDelivery';
import {
  formatDeliveryDateShort,
  getDefaultDeliveryDateKey,
} from './shopDeliveryDate';
import {
  formatQuantityWithUnit,
  getPriceUnitSuffix,
  normalizeShopQuantityUnit,
} from './shopQuantityUnit';
import { normalizeBeninPhoneDigits } from './phoneDigits';
import { normalizeTextForWhatsAppPrefill } from './orderTrackingWhatsApp';

export const SHOP_ORDER_STORAGE_KEY = 'rapido_shop_order_pending';

const RAPIDO_WA_DISPLAY = '+229 40 39 39 94';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/** Enregistre la commande côté serveur (dashboard + notifications). */
export async function submitShopOrderToApi(order) {
  const res = await fetch(`${API_URL}/shop-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: order.slug,
      quantity: order.quantity,
      customer: order.customer,
      eviscerationCleaning: !!order.eviscerationCleaning,
      // requestedDeliveryAt: order.requestedDeliveryAt || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Impossible d’enregistrer la commande');
  }
  return data;
}

/** Texte court (WhatsApp, exports) — livraison J+1. */
export const SHOP_DELIVERY_NOTE =
  'NB : commande aujourd’hui, livraison un jour après (le lendemain). Soyez disponible à l’adresse indiquée.';

export function emptyCustomerForm() {
  return {
    firstName: '',
    lastName: '',
    phone: '',
    city: '',
    addressDescription: '',
    deliveryDate: getDefaultDeliveryDateKey(),
  };
}

export function buildShopOrderPayload(product, promoState, quantity, customer, options = {}) {
  const unitPrice = promoState?.isPromoLive ? promoState.promoPrice : product.basePrice;
  const quantityUnit = normalizeShopQuantityUnit(product.quantityUnit);
  const deliveryFee = getShopDeliveryFee(product, promoState);
  const eviscerationCleaning = !!options.eviscerationCleaning;
  const { subtotalPrice, totalPrice, eviscerationFee } = computeShopOrderTotals(
    unitPrice,
    quantity,
    deliveryFee,
    { eviscerationCleaning, quantityUnit }
  );
  return {
    slug: product.slug,
    productName: product.name,
    quantity,
    quantityUnit,
    quantityLabel: formatQuantityWithUnit(quantity, quantityUnit),
    unitPrice,
    subtotalPrice,
    deliveryFee,
    eviscerationCleaning: eviscerationFee > 0,
    eviscerationFee,
    totalPrice,
    basePrice: product.basePrice,
    isPromoLive: !!promoState?.isPromoLive,
    discountPercent: promoState?.discountPercent || 0,
    freeDelivery: !!promoState?.freeDelivery,
    whatsappNumber: product.whatsappNumber || '',
    ctaLabel: product.ctaLabel || 'Commander',
    customer: {
      firstName: String(customer.firstName || '').trim(),
      lastName: String(customer.lastName || '').trim(),
      phone: String(customer.phone || '').trim(),
      city: String(customer.city || '').trim(),
      addressDescription: String(customer.addressDescription || '').trim(),
    },
    // requestedDeliveryAt,
    // deliveryDateLabel: formatDeliveryDateShort(deliveryDate),
    createdAt: new Date().toISOString(),
  };
}

export function saveShopOrder(order) {
  try {
    sessionStorage.setItem(SHOP_ORDER_STORAGE_KEY, JSON.stringify(order));
    return true;
  } catch {
    return false;
  }
}

export function loadShopOrder(expectedSlug) {
  try {
    const raw = sessionStorage.getItem(SHOP_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const order = JSON.parse(raw);
    if (expectedSlug && order.slug !== expectedSlug) return null;
    return order;
  } catch {
    return null;
  }
}

export function clearShopOrder() {
  try {
    sessionStorage.removeItem(SHOP_ORDER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function formatCustomerFullName(customer) {
  return [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim();
}

export function formatCustomerAddress(customer) {
  const city = customer?.city || customer?.address;
  const parts = [city, customer?.addressDescription].filter(Boolean);
  return parts.join(' — ');
}

function firstNameFrom(customer) {
  const part = String(customer?.firstName || formatCustomerFullName(customer) || '')
    .trim()
    .split(/\s+/)[0];
  return part || 'Client';
}

/** Message de confirmation professionnel (WhatsApp, sans API — envoi vers le numéro du client). */
export function buildShopOrderClientConfirmationMessage(order) {
  const name = firstNameFrom(order.customer);
  const addressLine = formatCustomerAddress(order.customer);
  const lines = [
    `Bonjour ${name} 👋`,
    '',
    '✅ *Commande confirmée — Rapido Flash*',
    '',
    'Votre commande est bien enregistrée et validée par notre équipe.',
    '',
    `📦 *${order.productName}*`,
    `Quantité : ${order.quantityLabel || order.quantity}`,
  ];

  if (order.freeDelivery) {
    lines.push('Livraison : *gratuite* (offre en cours)');
  } else if (Number(order.deliveryFee) > 0) {
    lines.push(`Livraison : ${formatPriceXof(order.deliveryFee)}`);
  }

  if (Number(order.eviscerationFee) > 0) {
    lines.push(`Éviscération et nettoyage : ${formatPriceXof(order.eviscerationFee)}`);
  }

  lines.push(`*Total à payer : ${formatPriceXof(order.totalPrice)}*`);
  lines.push('');
  lines.push(`📍 ${addressLine}`);

  if (order.orderId) {
    lines.push(`🔖 Réf. : ${String(order.orderId).slice(-8).toUpperCase()}`);
  }

  lines.push('');
  lines.push('🚚 *Livraison demain* (sous 24 h)');
  lines.push('Restez joignable sur WhatsApp à l’adresse indiquée.');
  lines.push('');
  lines.push(`Une question ? ${RAPIDO_WA_DISPLAY}`);
  lines.push('');
  lines.push('— Équipe Rapido Flash');

  return lines.join('\n');
}

/** Ouvre WhatsApp avec la confirmation préremplie (discussion avec soi-même, sans API). */
export function openShopOrderWhatsAppConfirmation(order) {
  const digits = normalizeBeninPhoneDigits(order?.customer?.phone);
  if (!digits) return false;

  const text = normalizeTextForWhatsAppPrefill(buildShopOrderClientConfirmationMessage(order));
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function buildWhatsAppSupportUrl(order) {
  const raw = String(order?.whatsappNumber || '').replace(/\D/g, '');
  if (!raw) return null;
  const ref = order.orderId ? String(order.orderId).slice(-8).toUpperCase() : '';
  const text = encodeURIComponent(
    `Bonjour Rapido, j’ai une question sur ma commande Shop${ref ? ` (réf. ${ref})` : ''}.`
  );
  return `https://wa.me/${raw}?text=${text}`;
}

export function buildWhatsAppOrderMessage(order) {
  const name = formatCustomerFullName(order.customer);
  const addressLine = formatCustomerAddress(order.customer);
  const lines = [
    'Bonjour Rapido, je souhaite passer commande (Shop express) :',
    '',
    `*Produit :* ${order.productName}`,
    `*Quantité :* ${order.quantityLabel || order.quantity}`,
    `*Prix unitaire :* ${formatPriceXof(order.unitPrice)}${getPriceUnitSuffix(order.quantityUnit)}`,
    `*Sous-total :* ${formatPriceXof(order.subtotalPrice ?? order.unitPrice * order.quantity)}`,
  ];
  if (order.isPromoLive && order.discountPercent) {
    lines.push(`*Promo :* -${order.discountPercent}%`);
  }
  if (order.freeDelivery) {
    lines.push('*Livraison gratuite* (offre en cours)');
  } else if (Number(order.deliveryFee) > 0) {
    lines.push(`*Frais de livraison :* ${formatPriceXof(order.deliveryFee)}`);
  }
  if (Number(order.eviscerationFee) > 0) {
    lines.push(`*Éviscération et nettoyage :* ${formatPriceXof(order.eviscerationFee)}`);
  }
  lines.push(`*Total à payer :* ${formatPriceXof(order.totalPrice)}`);
  lines.push(
    '',
    '*Mes coordonnées :*',
    `Nom : ${name}`,
    `Téléphone (WhatsApp) : ${order.customer.phone}`,
    `Ville / livraison : ${addressLine}`,
  );
  if (order.deliveryDateLabel || order.requestedDeliveryAt) {
    lines.push(
      `Date de livraison souhaitée : ${order.deliveryDateLabel || formatDeliveryDateShort(order.requestedDeliveryAt)}`
    );
  }
  lines.push('', 'Merci de confirmer ma commande.');
  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(order) {
  const raw = String(order?.whatsappNumber || '').replace(/\D/g, '');
  if (!raw) return null;
  const text = encodeURIComponent(buildWhatsAppOrderMessage(order));
  return `https://wa.me/${raw}?text=${text}`;
}

export function validateCustomerForm(customer) {
  const errors = {};
  if (!customer.firstName?.trim()) errors.firstName = 'Le prénom est requis';
  if (!customer.lastName?.trim()) errors.lastName = 'Le nom est requis';
  const phone = String(customer.phone || '').replace(/\s/g, '');
  if (!phone || phone.length < 8) errors.phone = 'Un numéro joignable est requis';
  if (!isValidShopCity(customer.city)) errors.city = 'Choisissez Cotonou ou Calavi';
  if (!customer.addressDescription?.trim()) {
    errors.addressDescription = 'Indiquez votre adresse complète de livraison';
  }
  // Champ date masqué — validation désactivée
  // const deliveryDate = customer.deliveryDate || getDefaultDeliveryDateKey();
  // if (!isAllowedDeliveryDateKey(deliveryDate)) {
  //   errors.deliveryDate = 'Choisissez une date de livraison parmi les 7 prochains jours';
  // }
  return errors;
}
