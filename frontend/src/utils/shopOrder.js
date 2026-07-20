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

export const SHOP_ORDER_STORAGE_KEY = 'rapido_shop_order_pending';

/** Numéro WhatsApp Shop (suivi commande, support) — local Bénin 40317568 → +229 40 31 75 68. */
export const SHOP_WHATSAPP_LOCAL = '40317568';

export function getShopWhatsAppDigits() {
  let digits = String(process.env.REACT_APP_SHOP_WHATSAPP || SHOP_WHATSAPP_LOCAL).replace(/\D/g, '');
  if (digits.length === 8) digits = `229${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) digits = `229${digits.slice(1)}`;
  return digits || `229${SHOP_WHATSAPP_LOCAL}`;
}

/** Normalise un numéro saisi (8 chiffres locaux, 0…, 229…) en digits wa.me. */
export function normalizeWhatsAppDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `229${digits}`;
  else if (digits.length === 9 && digits.startsWith('0')) digits = `229${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith('0')) digits = `229${digits.slice(1)}`;
  return digits;
}

/** Numéro du bouton « Suivre ma commande » : shop > défaut Rapido. */
export function resolveTrackingWhatsAppDigits(preferred) {
  return normalizeWhatsAppDigits(preferred) || getShopWhatsAppDigits();
}

export function formatWhatsAppDisplay(digits) {
  const d = resolveTrackingWhatsAppDigits(digits);
  if (d.length === 11 && d.startsWith('229')) {
    return `+229 ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  return d ? `+${d}` : getShopWhatsAppDisplay();
}

export function getShopWhatsAppDisplay() {
  const d = getShopWhatsAppDigits();
  if (d.length === 11 && d.startsWith('229')) {
    return `+229 ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  return d ? `+${d}` : `+229 ${SHOP_WHATSAPP_LOCAL}`;
}

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
    whatsappNumber: resolveTrackingWhatsAppDigits(product.whatsappNumber),
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

/** Message de confirmation professionnel (aperçu page + aligné backend). */
export function buildShopOrderClientConfirmationMessage(order) {
  const name = firstNameFrom(order.customer);
  const addressLine = formatCustomerAddress(order.customer);
  const ref = order.orderNumber || (order.orderId ? String(order.orderId).slice(-8).toUpperCase() : '');
  const lines = [
    `Bonjour ${name}`,
    '',
    '*Commande confirmée — Rapido Flash*',
    '',
    'Votre commande est bien enregistrée et validée par notre équipe.',
    '',
    `*${order.productName}*`,
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
  if (addressLine) lines.push(`Livraison : ${addressLine}`);
  if (ref) lines.push(`Réf. : ${ref}`);
  lines.push('');
  lines.push('*Livraison demain* (sous 24 h)');
  lines.push('Restez joignable sur WhatsApp à l’adresse indiquée.');
  lines.push('');
  lines.push('— Équipe Rapido Flash');

  return lines.join('\n');
}

/** Ouvre WhatsApp Rapido avec le récap commande ; planifie la réponse auto côté serveur. */
export async function openShopOrderWhatsAppTrack(order) {
  const url = buildWhatsAppOrderUrl(order);
  if (!url) return false;

  if (order.orderId && order.customer?.phone) {
    void fetch(`${API_URL}/shop-orders/${order.orderId}/whatsapp-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: order.customer.phone }),
    }).catch(() => {});
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function buildWhatsAppSupportUrl(order) {
  const raw = resolveTrackingWhatsAppDigits(order?.whatsappNumber);
  if (!raw) return null;
  const ref =
    order?.orderNumber ||
    (order?.orderId ? String(order.orderId).slice(-8).toUpperCase() : '');
  const text = encodeURIComponent(
    `Bonjour Rapido, j’ai une question sur ma commande Shop${ref ? ` (réf. ${ref})` : ''}.`
  );
  return `https://wa.me/${raw}?text=${text}`;
}

export function buildWhatsAppOrderMessage(order) {
  const name = formatCustomerFullName(order.customer);
  const addressLine = formatCustomerAddress(order.customer);
  const lines = [
    'Bonjour Rapido, je souhaite suivre ma commande (Shop express) :',
    '',
    '',
    `*Produit :* ${order.productName}`,
    '',
    `*Quantité :* ${order.quantityLabel || order.quantity}`,
    '',
    `*Prix unitaire :* ${formatPriceXof(order.unitPrice)}${getPriceUnitSuffix(order.quantityUnit)}`,
    '',
    `*Sous-total :* ${formatPriceXof(order.subtotalPrice ?? order.unitPrice * order.quantity)}`,
  ];
  if (order.isPromoLive && order.discountPercent) {
    lines.push('', `*Promo :* -${order.discountPercent}%`);
  }
  if (order.freeDelivery) {
    lines.push('', '*Frais de livraison :* Gratuite (offre en cours)');
  } else if (Number(order.deliveryFee) > 0) {
    lines.push('', `*Frais de livraison :* ${formatPriceXof(order.deliveryFee)}`);
  }
  if (Number(order.eviscerationFee) > 0) {
    lines.push('', `*Éviscération et nettoyage :* ${formatPriceXof(order.eviscerationFee)}`);
  }
  lines.push(
    '',
    `*Total à payer :* ${formatPriceXof(order.totalPrice)}`,
    '',
    '',
    '*Mes coordonnées :*',
    '',
    `Nom : ${name}`,
    '',
    `Téléphone (WhatsApp) : ${order.customer.phone}`,
    '',
    `Ville / livraison : ${addressLine}`,
  );
  if (order.orderNumber) {
    lines.push('', `Réf. commande : ${order.orderNumber}`);
  } else if (order.orderId) {
    lines.push('', `Réf. commande : ${String(order.orderId).slice(-8).toUpperCase()}`);
  }
  lines.push('', '', 'Merci de confirmer ma commande.');
  return lines.join('\n');
}

export function buildWhatsAppOrderUrl(order) {
  const raw = resolveTrackingWhatsAppDigits(order?.whatsappNumber);
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
