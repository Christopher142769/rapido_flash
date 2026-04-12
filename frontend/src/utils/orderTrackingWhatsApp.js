/**
 * Numéro de suivi (WhatsApp) — chiffres uniquement avec indicatif pays.
 * Défaut équipe Rapido : indicatif Bénin +229 + 40393994 → surcharge possible via REACT_APP_RAPIDO_WHATSAPP.
 */
const DEFAULT_RAPIDO_WA_DIGITS = '22940393994';

export function getRapidoWhatsAppDigits() {
  const raw = process.env.REACT_APP_RAPIDO_WHATSAPP;
  const s = raw != null && String(raw).trim() !== '' ? String(raw) : DEFAULT_RAPIDO_WA_DIGITS;
  return s.replace(/\D/g, '');
}

export function buildOrderItemsBlock(commande, language) {
  const en = String(language || '').toLowerCase().startsWith('en');
  const lines = [];
  (commande.plats || []).forEach((item) => {
    const name = item.plat?.nom || (en ? 'Item' : 'Article');
    const q = item.quantite;
    const sub = (Number(item.prix) * Number(q)).toFixed(0);
    lines.push(`- ${name} x ${q} : ${sub} FCFA`);
  });
  (commande.produits || []).forEach((item) => {
    const name = item.produit?.nom || (en ? 'Product' : 'Produit');
    const q = item.quantite;
    const sub = (Number(item.prix) * Number(q)).toFixed(0);
    const acc = (item.accompagnements || []).map((a) => a.nom).filter(Boolean);
    const accPart =
      acc.length > 0 ? (en ? ` (${acc.join(', ')})` : ` (${acc.join(', ')})`) : '';
    lines.push(`- ${name} x ${q}${accPart} : ${sub} FCFA`);
  });
  if (!lines.length) return en ? '(No items)' : '(Aucun article)';
  return lines.join('\n');
}

export function applyWhatsAppTemplate(template, vars) {
  const out = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) return '-';
    const v = vars[key];
    if (v === undefined || v === null) return '-';
    if (v === '') return '';
    return String(v);
  });
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Nettoie le texte avant `encodeURIComponent` pour wa.me : retire le caractere de remplacement (U+FFFD),
 * normalise en NFC et supprime les caracteres de controle.
 */
export function normalizeTextForWhatsAppPrefill(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}
