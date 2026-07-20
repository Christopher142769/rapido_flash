import {
  getShopWhatsAppDigits,
  emptyCustomerForm,
  validateCustomerForm,
  formatCustomerFullName,
  formatCustomerAddress,
  resolveTrackingWhatsAppDigits,
} from './shopOrder';
import { formatPriceXof } from './shopPromo';

export { emptyCustomerForm, validateCustomerForm };

export const MEAL_ORDER_STORAGE_KEY = 'rapido_meal_order_pending';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function saveMealOrder(order) {
  sessionStorage.setItem(MEAL_ORDER_STORAGE_KEY, JSON.stringify(order));
}

export function loadMealOrder() {
  try {
    const raw = sessionStorage.getItem(MEAL_ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function submitMealOrderToApi(cartItems, customer, options = {}) {
  const res = await fetch(`${API_URL}/meal-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cartItems.map((it) => ({
        mealProductId: it.mealProductId,
        quantity: it.quantity,
        accompagnements: (it.accompagnements || []).map((a) => ({
          id: a.id,
          name: a.name,
          quantity: a.quantity,
        })),
        options: (it.options || []).map((o) => ({
          groupId: o.groupId,
          groupName: o.groupName,
          choiceId: o.choiceId,
          choiceLabel: o.choiceLabel,
        })),
        specifications: it.specifications || '',
      })),
      customer,
      requestedDeliveryAt: options.requestedDeliveryAt,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Erreur lors de la commande');
  return data;
}

export function buildMealWhatsAppMessage(order) {
  const name = formatCustomerFullName(order.customer);
  const addressLine = formatCustomerAddress(order.customer);
  const lines = [
    'Bonjour Rapido, je souhaite suivre ma commande (Shop repas) :',
    '',
    '',
  ];

  (order.items || []).forEach((it, idx) => {
    if (idx > 0) lines.push('', '———', '');
    lines.push(`*Produit :* ${it.productName}`);
    lines.push('', `*Quantité :* ${it.quantity}`);
    lines.push('', `*Prix unitaire :* ${formatPriceXof(it.unitPrice)}`);
    if (it.isPromoLive && it.discountPercent) {
      lines.push('', `*Promo :* -${it.discountPercent}%`);
    }
    (it.options || []).forEach((o) => {
      const suffix = Number(o.price) > 0 ? ` (${formatPriceXof(o.price)})` : '';
      lines.push('', `*${o.groupName} :* ${o.choiceLabel}${suffix}`);
    });
    (it.accompagnements || []).forEach((a) => {
      lines.push(
        '',
        `*Accompagnement :* ${a.name} ×${a.quantity} (${formatPriceXof(a.price * a.quantity)})`
      );
    });
    if (it.specifications) {
      lines.push('', `*Spécifications :* ${it.specifications}`);
    }
    lines.push('', `*Sous-total ligne :* ${formatPriceXof(it.lineTotal)}`);
  });

  lines.push('', '');
  if (order.freeDelivery) {
    lines.push('*Frais de livraison :* Gratuite');
  } else if (Number(order.deliveryFee) > 0) {
    lines.push(`*Frais de livraison :* ${formatPriceXof(order.deliveryFee)}`);
  }
  lines.push('', `*Total à payer :* ${formatPriceXof(order.totalPrice)}`);
  lines.push(
    '',
    '',
    '*Mes coordonnées :*',
    '',
    `Nom : ${name}`,
    '',
    `Téléphone (WhatsApp) : ${order.customer.phone}`,
    '',
    `Ville / livraison : ${addressLine}`
  );
  if (order.orderNumber) {
    lines.push('', `Réf. commande : ${order.orderNumber}`);
  }
  lines.push('', '', 'Merci de confirmer ma commande.');
  return lines.join('\n');
}

export function buildMealWhatsAppOrderUrl(order) {
  const raw = resolveTrackingWhatsAppDigits(order?.whatsappNumber);
  if (!raw) return null;
  return `https://wa.me/${raw}?text=${encodeURIComponent(buildMealWhatsAppMessage(order))}`;
}

export async function openMealOrderWhatsAppTrack(order) {
  const url = buildMealWhatsAppOrderUrl(order);
  if (!url) return false;
  if (order._id || order.orderId) {
    const id = order._id || order.orderId;
    void fetch(`${API_URL}/meal-orders/${id}/whatsapp-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: order.customer?.phone }),
    }).catch(() => {});
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
