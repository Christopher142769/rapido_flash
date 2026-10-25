import { displaySideName } from './repasRefonteConstants';

/**
 * Accompagnements et suppléments : la liste et les prix viennent du catalogue géré dans le
 * dashboard (product.accompagnements / product.supplements fournis par l'API).
 */
function formatAmount(price) {
  return String(Math.round(Number(price) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Accompagnement : « Inclus » ou supplément de prix (« + 500 F », ex. frites à la place du riz).
 * Supplément : portion en plus, prix complet (« + 1 000 F »).
 */
export function formatSidePriceLabel(price, role) {
  const value = Math.max(0, Math.round(Number(price) || 0));
  if (role === 'extra') return `+ ${formatAmount(value)} F`;
  return value > 0 ? `+ ${formatAmount(value)} F` : 'Inclus';
}

function sameSideName(a, b) {
  const norm = (v) =>
    String(v || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  return norm(a) && norm(a) === norm(b);
}

/** Accompagnement présélectionné : le premier inclus (sans supplément), sinon le premier. */
export function defaultSideKey(product) {
  const sides = productSideOptions(product);
  return (sides.find((s) => s.price === 0) || sides[0])?.key || '';
}

/** Suppléments proposés : sans l’accompagnement déjà choisi. */
export function supplementOptionsFor(product, sideKey) {
  const side = productSideOptions(product).find((s) => s.key === sideKey);
  return supplementOptions(product).filter((x) => !side || !sameSideName(x.name, side.name));
}

export function productSideOptions(product) {
  return (product?.accompagnements || [])
    .filter((a) => a && a.available !== false && String(a.name || '').trim())
    .map((a) => ({
      key: String(a._id || a.name),
      id: a._id || '',
      name: displaySideName(a.name),
      price: Math.max(0, Math.round(Number(a.price) || 0)),
    }));
}

export function supplementOptions(product) {
  return (product?.supplements || [])
    .filter((s) => s && String(s.name || '').trim())
    .map((s) => ({
      key: String(s._id || s.name),
      id: s._id || '',
      name: displaySideName(s.name),
      price: Math.max(0, Math.round(Number(s.price) || 0)),
    }));
}

export function buildSideLines(product, sideKey, extraQty) {
  const lines = [];
  const side = productSideOptions(product).find((s) => s.key === sideKey);
  if (side) {
    lines.push({
      id: side.id,
      name: side.name,
      price: side.price,
      quantity: 1,
      role: 'side',
    });
  }
  supplementOptionsFor(product, sideKey).forEach((extra) => {
    const quantity = Math.min(5, Math.max(0, Math.round(Number(extraQty?.[extra.key]) || 0)));
    if (quantity < 1) return;
    lines.push({
      id: extra.id,
      name: extra.name,
      price: extra.price,
      quantity,
      role: 'extra',
    });
  });
  return lines;
}
