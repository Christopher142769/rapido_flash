/** Numéro équipe Rapido pour notifications commandes (chiffres, indicatif pays). */
const DEFAULT_RAPIDO_WA_DIGITS = '22940393994';

/**
 * Destinataire des alertes commandes (backend).
 * RAPIDO_WHATSAPP ou REACT_APP_RAPIDO_WHATSAPP — ex. 22940393994 ou +229 40 39 39 94
 */
function getRapidoWhatsAppNotifyDigits() {
  const raw =
    process.env.RAPIDO_WHATSAPP ||
    process.env.REACT_APP_RAPIDO_WHATSAPP ||
    DEFAULT_RAPIDO_WA_DIGITS;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 8) {
    digits = `229${digits}`;
  }
  return digits || DEFAULT_RAPIDO_WA_DIGITS;
}

module.exports = { getRapidoWhatsAppNotifyDigits, DEFAULT_RAPIDO_WA_DIGITS };
