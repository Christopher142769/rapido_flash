/**
 * Valeurs par défaut et résolution des réglages Shop Repas
 * (frais de livraison par ville, WhatsApp de suivi). Source unique côté backend.
 */
const MEAL_CITIES = ['Cotonou', 'Calavi'];
const DEFAULT_DELIVERY_FEES = { Cotonou: 700, Calavi: 1000 };
/** 40 31 75 68 (Bénin, +229). */
const DEFAULT_TRACKING_WHATSAPP = '22940317568';

function normalizeBeninDigits(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 8) return `229${d}`;
  if (d.startsWith('00229')) return d.slice(2);
  return d;
}

function formatBeninDisplay(digits) {
  const d = String(digits || '');
  const m = d.match(/^229(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (m) return `+229 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return d ? `+${d}` : '';
}

function feeOrDefault(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function resolveDeliveryFees(settings) {
  return {
    Cotonou: feeOrDefault(settings?.deliveryFeeCotonou, DEFAULT_DELIVERY_FEES.Cotonou),
    Calavi: feeOrDefault(settings?.deliveryFeeCalavi, DEFAULT_DELIVERY_FEES.Calavi),
  };
}

function getMealDeliveryFee(settings, city) {
  const fees = resolveDeliveryFees(settings);
  return fees[city] ?? fees.Cotonou;
}

function resolveTrackingWhatsApp(settings) {
  const digits = normalizeBeninDigits(settings?.trackingWhatsAppNumber) || DEFAULT_TRACKING_WHATSAPP;
  return { digits, display: formatBeninDisplay(digits) };
}

module.exports = {
  MEAL_CITIES,
  DEFAULT_DELIVERY_FEES,
  DEFAULT_TRACKING_WHATSAPP,
  normalizeBeninDigits,
  resolveDeliveryFees,
  getMealDeliveryFee,
  resolveTrackingWhatsApp,
};
