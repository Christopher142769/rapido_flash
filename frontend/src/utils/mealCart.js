/** Panier Shop Repas — localStorage */
export const MEAL_CART_KEY = 'rapido_meal_cart';

export function loadMealCart() {
  try {
    const raw = localStorage.getItem(MEAL_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMealCart(items) {
  localStorage.setItem(MEAL_CART_KEY, JSON.stringify(items || []));
  window.dispatchEvent(new CustomEvent('rapido-meal-cart'));
}

export function clearMealCart() {
  localStorage.removeItem(MEAL_CART_KEY);
  window.dispatchEvent(new CustomEvent('rapido-meal-cart'));
}

export function mealCartCount(items = loadMealCart()) {
  return items.reduce((n, it) => n + Math.max(0, Number(it.quantity) || 0), 0);
}

function normalizeOptions(options = []) {
  return (Array.isArray(options) ? options : [])
    .map((o) => ({
      groupId: o.groupId || '',
      groupName: o.groupName || '',
      choiceId: o.choiceId || '',
      choiceLabel: o.choiceLabel || '',
      price: Number(o.price) || 0,
    }))
    .filter((o) => o.choiceLabel);
}

/**
 * @param {object} product
 * @param {number} quantity
 * @param {{ id: string, name: string, price: number, quantity: number }[]} accompagnements
 * @param {{ groupId, groupName, choiceId, choiceLabel, price }[]} options
 * @param {string} specifications
 */
export function addMealToCart(product, quantity, accompagnements = [], options = [], specifications = '') {
  const cart = loadMealCart();
  const qty = Math.max(1, Math.round(Number(quantity) || 1));
  const normalizedAcc = accompagnements
    .filter((a) => Number(a.quantity) > 0)
    .map((a) => ({
      id: a.id || a._id,
      name: a.name,
      price: Number(a.price) || 0,
      quantity: Math.max(1, Math.round(Number(a.quantity) || 1)),
    }));
  const normalizedOpts = normalizeOptions(options);
  const spec = String(specifications || '').trim().slice(0, 500);

  const accKey = normalizedAcc
    .map((a) => `${a.id || a.name}:${a.quantity}`)
    .sort()
    .join('|');
  const optKey = normalizedOpts
    .map((o) => `${o.groupId || o.groupName}=${o.choiceId || o.choiceLabel}`)
    .sort()
    .join('|');
  const specKey = spec ? `s:${spec}` : '';
  const lineKey = `${product._id}::${accKey}::${optKey}::${specKey}`;

  const existing = cart.find((it) => it.lineKey === lineKey);
  if (existing) {
    existing.quantity += qty;
    const byId = new Map(
      (existing.accompagnements || []).map((a) => [String(a.id || a.name), { ...a }])
    );
    for (const a of normalizedAcc) {
      const key = String(a.id || a.name);
      const prev = byId.get(key);
      if (prev) {
        prev.quantity += a.quantity;
      } else {
        byId.set(key, { ...a });
      }
    }
    existing.accompagnements = Array.from(byId.values());
  } else {
    cart.push({
      lineKey,
      mealProductId: product._id,
      productName: product.name,
      slug: product.slug,
      image: product.mainImage || product.images?.[0] || '',
      unitPrice: product.isPromoLive ? product.promoPrice : product.basePrice,
      basePrice: product.basePrice,
      isPromoLive: !!product.isPromoLive,
      discountPercent: product.discountPercent || 0,
      quantity: qty,
      accompagnements: normalizedAcc,
      options: normalizedOpts,
      specifications: spec,
    });
  }
  saveMealCart(cart);
  return cart;
}

export function lineMealSubtotal(it) {
  const acc = (it.accompagnements || []).reduce(
    (s, a) => s + Number(a.price || 0) * Number(a.quantity || 0),
    0
  );
  const optPerUnit = (it.options || []).reduce((s, o) => s + Number(o.price || 0), 0);
  return Math.round(
    (Number(it.unitPrice || 0) + optPerUnit) * Number(it.quantity || 0) + acc
  );
}

export function updateMealCartLine(lineKey, patch) {
  const cart = loadMealCart().map((it) => {
    if (it.lineKey !== lineKey) return it;
    return { ...it, ...patch };
  }).filter((it) => Number(it.quantity) > 0);
  saveMealCart(cart);
  return cart;
}

export function removeMealCartLine(lineKey) {
  const cart = loadMealCart().filter((it) => it.lineKey !== lineKey);
  saveMealCart(cart);
  return cart;
}

export function estimateMealCartTotals(items, deliveryFee = 0, freeDelivery = false) {
  const subtotal = items.reduce((sum, it) => sum + lineMealSubtotal(it), 0);
  const fee = freeDelivery ? 0 : Math.max(0, Number(deliveryFee) || 0);
  return { subtotalPrice: Math.round(subtotal), deliveryFee: fee, totalPrice: Math.round(subtotal) + fee };
}
