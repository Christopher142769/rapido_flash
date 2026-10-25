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

/** Numéro officiel de commande Rapido : 01 40 39 39 94 (Bénin, 10 chiffres depuis 2024). */
export const OFFICIAL_WHATSAPP_DIGITS = '2290140393994';
/** Ancien défaut à 8 chiffres jamais personnalisé : remplacé par le numéro officiel. */
const LEGACY_DEFAULT_WHATSAPP = '22940317568';

/**
 * Normalise un numéro béninois en digits wa.me au format actuel (229 + 10 chiffres).
 * Les anciens numéros à 8 chiffres reçoivent le préfixe 01 (migration de 2024).
 */
export function normalizeWhatsAppDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits === LEGACY_DEFAULT_WHATSAPP) return OFFICIAL_WHATSAPP_DIGITS;
  let local = digits.startsWith('229') && digits.length >= 11 ? digits.slice(3) : digits;
  if (local.length === 8) local = `01${local}`;
  else if (local.length === 9 && local.startsWith('1')) local = `0${local}`;
  if (local.length === 10 && local.startsWith('01')) return `229${local}`;
  return digits;
}

export function getShopWhatsAppDigits() {
  return normalizeWhatsAppDigits(process.env.REACT_APP_SHOP_WHATSAPP) || OFFICIAL_WHATSAPP_DIGITS;
}

/** Numéro du bouton « Suivre ma commande » : shop > défaut Rapido. */
export function resolveTrackingWhatsAppDigits(preferred) {
  return normalizeWhatsAppDigits(preferred) || getShopWhatsAppDigits();
}

/** +229 01 40 39 39 94 */
export function formatBeninWhatsAppDisplay(digits) {
  const m = String(digits || '').match(/^229(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (m) return `+229 ${m.slice(1).join(' ')}`;
  return digits ? `+${digits}` : '';
}

export function formatWhatsAppDisplay(digits) {
  return formatBeninWhatsAppDisplay(resolveTrackingWhatsAppDigits(digits));
}

export function getShopWhatsAppDisplay() {
  return formatBeninWhatsAppDisplay(getShopWhatsAppDigits());
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
  const deliveryFee = Number.isFinite(options.deliveryFee)
    ? options.deliveryFee
    : getShopDeliveryFee(product, promoState);
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

/**
 * Numéro béninois au format actuel à 10 chiffres (01 XX XX XX XX), avec ou sans +229 / 00229.
 * Renvoie un message d’erreur, ou '' si le numéro est valide. Les anciens numéros à 8 chiffres
 * ne sont plus joignables depuis la migration de 2024 : on demande d’ajouter 01 devant.
 */
export function beninPhoneError(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return 'Un numéro joignable est requis';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('229') && (digits.length === 13 || digits.length === 11)) digits = digits.slice(3);
  if (digits.length === 10 && digits.startsWith('01')) return '';
  if (digits.length === 8) return 'Ajoutez 01 devant votre numéro (10 chiffres, ex. 01 97 00 00 00)';
  return 'Numéro à 10 chiffres, ex. 01 97 00 00 00 (avec ou sans +229)';
}

export function validateCustomerForm(customer) {
  const errors = {};
  if (!customer.firstName?.trim()) errors.firstName = 'Le prénom est requis';
  if (!customer.lastName?.trim()) errors.lastName = 'Le nom est requis';
  const phoneError = beninPhoneError(customer.phone);
  if (phoneError) errors.phone = phoneError;
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
