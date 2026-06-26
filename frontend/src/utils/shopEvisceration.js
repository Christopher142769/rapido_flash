export const EVISCERATION_FEE_PER_KG = 200;

export function quantityToKg(quantity, unit) {
  const q = Number(quantity) || 0;
  switch (unit) {
    case 'kg':
      return q;
    case 'g':
      return q / 1000;
    case 'tonne':
      return q * 1000;
    default:
      return 0;
  }
}

export function isEviscerationApplicable(quantityUnit) {
  return ['kg', 'g', 'tonne'].includes(quantityUnit);
}

export function computeEviscerationFee(quantity, quantityUnit, enabled) {
  if (!enabled || !isEviscerationApplicable(quantityUnit)) return 0;
  return Math.round(EVISCERATION_FEE_PER_KG * quantityToKg(quantity, quantityUnit));
}

export function formatEviscerationLabel(enabled) {
  return enabled ? 'Oui' : 'Non';
}
