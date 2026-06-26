const EVISCERATION_FEE_PER_KG = 200;

function quantityToKg(quantity, unit) {
  const q = Number(quantity) || 0;
  switch (unit) {
    case 'kg':
      return q;
    case 'g':
      return q / 1000;
    case 'tonne':
      return q * 1000;
    case 'unit':
      return q;
    default:
      return q;
  }
}

function isEviscerationApplicable(_quantityUnit) {
  return true;
}

function computeEviscerationFee(quantity, quantityUnit, enabled) {
  if (!enabled || !isEviscerationApplicable(quantityUnit)) return 0;
  return Math.round(EVISCERATION_FEE_PER_KG * quantityToKg(quantity, quantityUnit));
}

module.exports = {
  EVISCERATION_FEE_PER_KG,
  quantityToKg,
  isEviscerationApplicable,
  computeEviscerationFee,
};
