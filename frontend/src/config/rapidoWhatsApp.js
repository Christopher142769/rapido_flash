import { getRapidoWhatsAppDigits } from '../utils/orderTrackingWhatsApp';

/** Numéro WhatsApp officiel Rapido (+229 …), chiffres pour wa.me */
export { getRapidoWhatsAppDigits };

export function getRapidoWhatsAppLink() {
  return `https://wa.me/${getRapidoWhatsAppDigits()}`;
}

/** Lien d’appel téléphonique vers le numéro unique plateforme (international +indicatif). */
export function getRapidoTelHref() {
  const d = String(getRapidoWhatsAppDigits() || '').replace(/\D/g, '');
  if (d.length < 8) return '#';
  return `tel:+${d}`;
}

/** Affichage lisible du numéro (ex. +229 40 39 39 94). */
export function getRapidoPhoneDisplay() {
  const d = String(getRapidoWhatsAppDigits() || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('229')) {
    return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  if (d) return `+${d}`;
  return '';
}

/**
 * Messagerie : appel téléphone direct (ouvre l’app Téléphone).
 * Défaut : +229 01 40 39 39 94 → E.164 tel:+2290140393994.
 * Surcharge : REACT_APP_MESSAGERIE_DIRECT_CALL (ex. 2290140393994, +229 01 40 39 39 94, ou 0140393994).
 */
function messagerieDigitsNormalized() {
  let d = String(process.env.REACT_APP_MESSAGERIE_DIRECT_CALL || '2290140393994')
    .trim()
    .replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('0')) d = `229${d}`;
  return d;
}

export function getMessagerieDirectCallRaw() {
  return String(process.env.REACT_APP_MESSAGERIE_DIRECT_CALL || '2290140393994').trim();
}

export function getMessagerieDirectTelHref() {
  const d = messagerieDigitsNormalized();
  if (d.length < 11 || !d.startsWith('229')) return '#';
  return `tel:+${d}`;
}

export function getMessagerieDirectTelDisplay() {
  const d = messagerieDigitsNormalized();
  if (d.length === 13) {
    const sub = d.slice(3);
    return `+229 ${sub.slice(0, 2)} ${sub.slice(2, 4)} ${sub.slice(4, 6)} ${sub.slice(6, 8)} ${sub.slice(8)}`;
  }
  if (d.length === 11) {
    return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  return getMessagerieDirectCallRaw();
}
