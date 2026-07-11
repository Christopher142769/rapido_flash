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

/**
 * @param {object} product
 * @param {number} quantity
 * @param {{ id: string, name: string, price: number, quantity: number }[]} accompagnements
 */
export function addMealToCart(product, quantity, accompagnements = []) {
  const cart = loadMealCart();
  const qty = Math.max(1, Math.round(Number(quantity) || 1));
  const accKey = accompagnements
    .filter((a) => a.quantity > 0)
    .map((a) => `${a.id || a.name}:${a.quantity}`)
    .sort()
    .join('|');
  const lineKey = `${product._id}::${accKey}`;

  const existing = cart.find((it) => it.lineKey === lineKey);
  if (existing) {
    existing.quantity += qty;
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
      accompagnements: accompagnements
        .filter((a) => a.quantity > 0)
        .map((a) => ({
          id: a.id || a._id,
          name: a.name,
          price: Number(a.price) || 0,
          quantity: Math.max(1, Number(a.quantity) || 1),
        })),
    });
  }
  saveMealCart(cart);
  return cart;
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
  const subtotal = items.reduce((sum, it) => {
    const acc = (it.accompagnements || []).reduce(
      (s, a) => s + Number(a.price || 0) * Number(a.quantity || 0),
      0
    );
    return sum + Number(it.unitPrice || 0) * Number(it.quantity || 0) + acc;
  }, 0);
  const fee = freeDelivery ? 0 : Math.max(0, Number(deliveryFee) || 0);
  return { subtotalPrice: Math.round(subtotal), deliveryFee: fee, totalPrice: Math.round(subtotal) + fee };
}
