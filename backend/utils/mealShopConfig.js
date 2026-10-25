/**
 * Valeurs par défaut et résolution des réglages Shop Repas
 * (frais de livraison par ville, WhatsApp de suivi). Source unique côté backend.
 */
const MEAL_CITIES = ['Cotonou', 'Calavi'];
const DEFAULT_DELIVERY_FEES = { Cotonou: 700, Calavi: 1000 };
/** WhatsApp Shop Repas (plats) : 01 40 31 75 68 (Bénin, +229, 10 chiffres depuis 2024). */
const DEFAULT_TRACKING_WHATSAPP = '2290140317568';
/** WhatsApp poisson frais (shops tilapia / mâchoiron) : 01 40 39 39 94. */
const DEFAULT_SHOP_WHATSAPP = '2290140393994';

/**
 * Digits wa.me au format béninois actuel (229 + 10 chiffres). Les anciens numéros à
 * 8 chiffres reçoivent le préfixe 01 (sinon les liens WhatsApp ne mènent nulle part).
 */
function normalizeBeninDigits(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  let local = d.startsWith('229') && d.length >= 11 ? d.slice(3) : d;
  if (local.length === 8) local = `01${local}`;
  else if (local.length === 9 && local.startsWith('1')) local = `0${local}`;
  if (local.length === 10 && local.startsWith('01')) return `229${local}`;
  return d;
}

function formatBeninDisplay(digits) {
  const d = String(digits || '');
  const m = d.match(/^229(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (m) return `+229 ${m.slice(1).join(' ')}`;
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
  DEFAULT_SHOP_WHATSAPP,
  normalizeBeninDigits,
  resolveDeliveryFees,
  getMealDeliveryFee,
  resolveTrackingWhatsApp,
};
