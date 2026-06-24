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
    email: '',
    city: '',
    addressDescription: '',
    deliveryDate: getDefaultDeliveryDateKey(),
  };
}

export function buildShopOrderPayload(product, promoState, quantity, customer) {
  const unitPrice = promoState?.isPromoLive ? promoState.promoPrice : product.basePrice;
  const quantityUnit = normalizeShopQuantityUnit(product.quantityUnit);
  const deliveryFee = getShopDeliveryFee(product, promoState);
  const { subtotalPrice, totalPrice } = computeShopOrderTotals(unitPrice, quantity, deliveryFee);
  return {
    slug: product.slug,
    productName: product.name,
    quantity,
    quantityUnit,
    quantityLabel: formatQuantityWithUnit(quantity, quantityUnit),
    unitPrice,
    subtotalPrice,
    deliveryFee,
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
      email: String(customer.email || '').trim().toLowerCase(),
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
  const email = String(customer.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Adresse email invalide';
  }
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
