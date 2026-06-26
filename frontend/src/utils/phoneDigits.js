/** Normalise un numéro mobile (Bénin par défaut) en chiffres internationaux sans +. */
export function normalizeBeninPhoneDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.length === 8) {
    digits = `229${digits}`;
  } else if (digits.length === 9 && digits.startsWith('0')) {
    digits = `229${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('0')) {
    digits = `229${digits.slice(1)}`;
  }

  if (digits.length < 11 || !digits.startsWith('229')) {
    return digits.length >= 10 ? digits : '';
  }

  return digits;
}
