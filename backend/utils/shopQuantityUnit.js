const SHOP_QUANTITY_UNITS = ['unit', 'kg', 'g', 'litre', 'tonne', 'm3'];

function normalizeShopQuantityUnit(value) {
  if (value && SHOP_QUANTITY_UNITS.includes(value)) return value;
  return 'unit';
}

module.exports = { SHOP_QUANTITY_UNITS, normalizeShopQuantityUnit };
