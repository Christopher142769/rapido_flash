const { normalizeShopQuantityUnit } = require('./shopQuantityUnit');

const UNIT_LABELS = {
  unit: { short: 'pièce', symbol: '' },
  kg: { short: 'kg', symbol: 'kg' },
  g: { short: 'g', symbol: 'g' },
  litre: { short: 'litre', symbol: 'L' },
  tonne: { short: 'tonne', symbol: 't' },
  m3: { short: 'm³', symbol: 'm³' },
};

function formatQuantityWithUnit(quantity, unit) {
  const q = Number(quantity);
  const safeQty = Number.isFinite(q) && q > 0 ? q : 1;
  const u = UNIT_LABELS[normalizeShopQuantityUnit(unit)] || UNIT_LABELS.unit;
  if (normalizeShopQuantityUnit(unit) === 'unit') return String(safeQty);
  return `${safeQty} ${u.symbol || u.short}`;
}

module.exports = { formatQuantityWithUnit };
