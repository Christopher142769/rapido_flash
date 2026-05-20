/** Unités de quantité configurables pour Rapido Shop */
export const SHOP_QUANTITY_UNITS = [
  { value: 'unit', label: 'Quantité simple (pièce)', short: 'pièce', symbol: '' },
  { value: 'kg', label: 'Kilogramme (kg)', short: 'kg', symbol: 'kg' },
  { value: 'g', label: 'Gramme (g)', short: 'g', symbol: 'g' },
  { value: 'litre', label: 'Litre (L)', short: 'litre', symbol: 'L' },
  { value: 'tonne', label: 'Tonne (t)', short: 'tonne', symbol: 't' },
  { value: 'm3', label: 'Mètre cube (m³)', short: 'm³', symbol: 'm³' },
];

const BY_VALUE = Object.fromEntries(SHOP_QUANTITY_UNITS.map((u) => [u.value, u]));

export const DEFAULT_SHOP_QUANTITY_UNIT = 'unit';

export function normalizeShopQuantityUnit(value) {
  if (value && BY_VALUE[value]) return value;
  return DEFAULT_SHOP_QUANTITY_UNIT;
}

export function getShopQuantityUnitOption(value) {
  return BY_VALUE[normalizeShopQuantityUnit(value)] || BY_VALUE.unit;
}

/** Libellé du sélecteur de quantité sur la page produit */
export function getQuantityPickerLabel(unit) {
  const u = getShopQuantityUnitOption(unit);
  if (u.value === 'unit') return 'Quantité';
  return `Quantité (${u.symbol || u.short})`;
}

/** Affichage : "2 kg", "3 L", "1" */
export function formatQuantityWithUnit(quantity, unit) {
  const q = Number(quantity);
  const safeQty = Number.isFinite(q) && q > 0 ? q : 1;
  const u = getShopQuantityUnitOption(unit);
  if (u.value === 'unit') return String(safeQty);
  return `${safeQty} ${u.symbol || u.short}`;
}

/** Prix unitaire : "CFA / kg" */
export function getPriceUnitSuffix(unit) {
  const u = getShopQuantityUnitOption(unit);
  if (u.value === 'unit') return '';
  return ` / ${u.symbol || u.short}`;
}
