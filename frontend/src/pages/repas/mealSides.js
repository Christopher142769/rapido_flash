import { displaySideName } from './repasRefonteConstants';

/** Carte des accompagnements King Fish. */
export const MEAL_SIDE_NAMES = [
  'Riz',
  'Légumes sautés',
  'Akassa',
  'Attiéké',
  'Aloko',
  'Banane bouillie',
  'Spaghetti',
  'Wassa wassa',
  'Frites',
];

export function isFriesName(name) {
  return /frites?/i.test(String(name || ''));
}

/** Accompagnement : offert, frites 500 F. Supplément : 500 F, frites 1 000 F. */
export function mealSidePrice(name, role) {
  if (role === 'extra') return isFriesName(name) ? 1000 : 500;
  return isFriesName(name) ? 500 : 0;
}

export function formatSidePriceLabel(name, role) {
  const price = mealSidePrice(name, role);
  const amount = String(price).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (role === 'extra') return `+ ${amount} F`;
  return price > 0 ? `${amount} F` : 'Gratuit';
}

export function productSideOptions(product) {
  return (product?.accompagnements || [])
    .filter((a) => a && a.available !== false && String(a.name || '').trim())
    .map((a) => ({
      key: String(a._id || a.name),
      id: a._id || '',
      name: displaySideName(a.name),
    }));
}

export function supplementOptions() {
  return MEAL_SIDE_NAMES.map((name) => ({
    key: name,
    name: displaySideName(name),
  }));
}

export function buildSideLines(product, sideKey, extraQty) {
  const lines = [];
  const side = productSideOptions(product).find((s) => s.key === sideKey);
  if (side) {
    lines.push({
      id: side.id,
      name: side.name,
      price: mealSidePrice(side.name, 'side'),
      quantity: 1,
      role: 'side',
    });
  }
  supplementOptions().forEach((extra) => {
    const quantity = Math.min(5, Math.max(0, Math.round(Number(extraQty?.[extra.key]) || 0)));
    if (quantity < 1) return;
    lines.push({
      name: extra.name,
      price: mealSidePrice(extra.name, 'extra'),
      quantity,
      role: 'extra',
    });
  });
  return lines;
}
