import { formatPriceXof } from './shopPromo';

export const SHOP_ORDER_STORAGE_KEY = 'rapido_shop_order_pending';

export const SHOP_DELIVERY_NOTE =
  "Note : Assurez-vous d'être prêt à vous faire livrer dans les 24h qui suivent la commande avant de passer commande.";

export function emptyCustomerForm() {
  return {
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    addressDescription: '',
  };
}

export function buildShopOrderPayload(product, promoState, quantity, customer) {
  const unitPrice = promoState?.isPromoLive ? promoState.promoPrice : product.basePrice;
  const total = unitPrice * quantity;
  return {
    slug: product.slug,
    productName: product.name,
    quantity,
    unitPrice,
    totalPrice: total,
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
      address: String(customer.address || '').trim(),
      addressDescription: String(customer.addressDescription || '').trim(),
    },
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
  const parts = [customer?.address, customer?.addressDescription].filter(Boolean);
  return parts.join(' — ');
}

export function buildWhatsAppOrderMessage(order) {
  const name = formatCustomerFullName(order.customer);
  const addressLine = formatCustomerAddress(order.customer);
  const lines = [
    'Bonjour Rapido, je souhaite passer commande (Shop express) :',
    '',
    `*Produit :* ${order.productName}`,
    `*Quantité :* ${order.quantity}`,
    `*Prix unitaire :* ${formatPriceXof(order.unitPrice)}`,
    `*Total :* ${formatPriceXof(order.totalPrice)}`,
  ];
  if (order.isPromoLive && order.discountPercent) {
    lines.push(`*Promo :* -${order.discountPercent}%`);
  }
  if (order.freeDelivery) lines.push('*Livraison gratuite* (offre en cours)');
  lines.push(
    '',
    '*Mes coordonnées :*',
    `Nom : ${name}`,
    `Téléphone : ${order.customer.phone}`,
    `Adresse : ${addressLine}`,
  );
  lines.push('', 'Merci de confirmer ma commande et le délai de livraison.');
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
  if (!customer.address?.trim()) errors.address = "L'adresse est requise";
  if (!customer.addressDescription?.trim()) {
    errors.addressDescription = 'Décrivez votre adresse (repères, étage, couleur du portail…)';
  }
  return errors;
}
