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
    // eslint-disable-next-line no-control-regex -- strip control chars before wa.me encodeURIComponent
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function statutLabelForTemplate(statut, t) {
  const map = {
    en_attente: 'statusPending',
    confirmee: 'statusConfirmed',
    en_preparation: 'statusPreparing',
    en_livraison: 'statusDelivery',
    livree: 'statusDelivered',
    annulee: 'statusCancelled',
  };
  const k = map[statut];
  return k ? t('orders', k) : statut;
}

function paymentLabelForTemplate(mode, t) {
  if (mode === 'especes') return t('orders', 'paymentCash');
  if (mode === 'momo_apres') return t('orders', 'paymentMomoAfter');
  return t('orders', 'paymentMomoBefore');
}

/** Ouvre WhatsApp avec le message de suivi (même logique que la page Commandes). */
export function openOrderTrackingWhatsApp(commande, { language, t, user }) {
  const rapidoWaDigits = getRapidoWhatsAppDigits();
  if (!rapidoWaDigits || !commande) return;

  const addr = commande.adresseLivraison || {};
  const lineAddr = (addr.adresse || '').trim();
  const geo =
    addr.latitude != null && addr.longitude != null
      ? `${Number(addr.latitude).toFixed(5)}, ${Number(addr.longitude).toFixed(5)}`
      : '';
  const addressFull = [lineAddr, geo].filter(Boolean).join(' | ') || '-';

  const paidExtra =
    commande.paiementEnLigneEffectue && commande.modePaiement === 'momo_avant'
      ? `- ${t('orders', 'whatsappPaidLine')}`
      : '';

  const vars = {
    ref: String(commande._id).slice(-8).toUpperCase(),
    id: String(commande._id),
    shop: commande.restaurant?.nom || '-',
    date: new Date(commande.createdAt).toLocaleString(
      String(language || '').toLowerCase().startsWith('en') ? 'en-GB' : 'fr-FR',
      { dateStyle: 'long', timeStyle: 'short' }
    ),
    status: statutLabelForTemplate(commande.statut, t),
    subtotal: Number(commande.sousTotal || 0).toFixed(0),
    shipping: Number(commande.fraisLivraison || 0).toFixed(0),
    total: Number(commande.total || 0).toFixed(0),
    payment: paymentLabelForTemplate(commande.modePaiement, t),
    paidExtra,
    address: addressFull,
    deliveryPhone: (addr.telephoneContact || '').trim() || '-',
    instruction: (addr.instruction || '').trim() || '-',
    items: buildOrderItemsBlock(commande, language),
    clientName: user?.nom || '-',
    clientEmail: user?.email || '-',
    accountPhone: (user?.telephone || '').trim() || '-',
  };

  const rawText = applyWhatsAppTemplate(t('orders', 'whatsappTemplate'), vars);
  const text = normalizeTextForWhatsAppPrefill(rawText);
  const url = `https://wa.me/${rapidoWaDigits}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
