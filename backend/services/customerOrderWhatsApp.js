const { normalizeBeninPhoneDigits } = require('../utils/phoneDigits');
const {
  isWhatsAppCloudConfigured,
  checkWhatsAppContact,
  sendWhatsAppText,
  sendWhatsAppTemplate,
} = require('./whatsappCloudApi');

const RAPIDO_WA_DISPLAY = '+229 40 39 39 94';
const DELIVERY_NOTE =
  'Commande aujourd’hui → livraison demain. Restez joignable à l’adresse indiquée.';

function isClientAutoMessageEnabled() {
  return process.env.WHATSAPP_CLIENT_AUTO_MESSAGE !== 'false';
}

function formatCfa(amount) {
  return `${Math.round(Number(amount) || 0).toLocaleString('fr-FR')} FCFA`;
}

function firstNameFrom(fullName) {
  const part = String(fullName || '').trim().split(/\s+/)[0];
  return part || 'Client';
}

function buildShopOrderClientMessage(order) {
  const c = order.customer || {};
  const name = firstNameFrom([c.firstName, c.lastName].filter(Boolean).join(' '));
  const address = [c.city, c.addressDescription].filter(Boolean).join(' — ');
  const lines = [
    `Bonjour ${name} 👋`,
    '',
    'Merci ! Votre commande *Rapido Flash* est bien enregistrée ✅',
    '',
    `📦 *${order.productName || 'Produit'}*`,
    `Quantité : ${order.quantityLabel || order.quantity}`,
    `Sous-total : ${formatCfa(order.subtotalPrice ?? order.totalPrice)}`,
  ];

  if (order.freeDelivery) {
    lines.push('Livraison : *gratuite* (offre en cours)');
  } else if (Number(order.deliveryFee) > 0) {
    lines.push(`Livraison : ${formatCfa(order.deliveryFee)}`);
  }

  lines.push(`*Total à payer : ${formatCfa(order.totalPrice)}*`);
  lines.push('');
  lines.push(`📍 ${address}`);
  if (order.orderNumber) {
    lines.push(`🔖 Réf. : ${order.orderNumber}`);
  }
  lines.push('');
  lines.push(`🚚 ${DELIVERY_NOTE}`);
  lines.push('');
  lines.push('Une question ? Répondez directement à ce message.');
  lines.push(`— Équipe Rapido Flash · ${RAPIDO_WA_DISPLAY}`);

  return lines.join('\n');
}

function buildCommandeClientMessage(commande, restaurant) {
  const client = commande.client;
  const clientName =
    (typeof client === 'object' && client?.nom) || commande.clientName || 'Client';
  const name = firstNameFrom(clientName);
  const restoName = restaurant?.nom || 'Rapido Flash';
  const addr = commande.adresseLivraison || {};
  const addressLine = [addr.adresse, addr.instruction].filter(Boolean).join(' — ');

  const itemLines = [];
  for (const item of commande.plats || []) {
    const plat = item.plat;
    const nom = typeof plat === 'object' ? plat?.nom : 'Plat';
    itemLines.push(`• ${nom} × ${item.quantite}`);
  }
  for (const item of commande.produits || []) {
    const produit = item.produit;
    const nom = typeof produit === 'object' ? produit?.nom : 'Produit';
    itemLines.push(`• ${nom} × ${item.quantite}`);
  }

  const lines = [
    `Bonjour ${name} 👋`,
    '',
    `Merci ! Votre commande chez *${restoName}* via Rapido Flash est bien enregistrée ✅`,
    '',
    '*Articles :*',
    ...(itemLines.length ? itemLines : ['• (détail sur l’application)']),
    '',
    `Sous-total : ${formatCfa(commande.sousTotal)}`,
    Number(commande.fraisLivraison) > 0
      ? `Livraison : ${formatCfa(commande.fraisLivraison)}`
      : 'Livraison : incluse',
    `*Total : ${formatCfa(commande.total)}*`,
    '',
    `📍 ${addressLine || '—'}`,
    '',
    `🚚 ${DELIVERY_NOTE}`,
    '',
    'Une question ? Répondez directement à ce message.',
    `— Équipe Rapido Flash · ${RAPIDO_WA_DISPLAY}`,
  ];

  return lines.join('\n');
}

async function sendClientWhatsAppMessage({ phone, message, logLabel }) {
  if (!isClientAutoMessageEnabled()) {
    return { sent: false, reason: 'disabled' };
  }

  const digits = normalizeBeninPhoneDigits(phone);
  if (!digits || digits.length < 11) {
    return { sent: false, reason: 'invalid_phone', phone };
  }

  if (!isWhatsAppCloudConfigured()) {
    console.log(`📱 [DEV WhatsApp client — ${logLabel}] Pas de Cloud API → ${digits}`);
    console.log(message);
    return { sent: false, reason: 'not_configured' };
  }

  const skipCheck = process.env.WHATSAPP_SKIP_CONTACT_CHECK === 'true';
  let toDigits = digits;

  if (!skipCheck) {
    const check = await checkWhatsAppContact(digits);
    if (!check.valid) {
      console.log(
        `[WhatsApp client — ${logLabel}] ${digits} non joignable WhatsApp (${check.reason || check.status})`
      );
      return { sent: false, reason: check.reason || 'not_on_whatsapp', phone: digits };
    }
    toDigits = check.waId || digits;
  }

  const templateName = String(process.env.WHATSAPP_ORDER_TEMPLATE_NAME || '').trim();
  if (templateName) {
    const lang = process.env.WHATSAPP_ORDER_TEMPLATE_LANG || 'fr';
    const result = await sendWhatsAppTemplate(toDigits, templateName, lang);
    if (result.sent) {
      console.log(`[WhatsApp client — ${logLabel}] Template envoyé → ${toDigits}`);
      return { ...result, phone: toDigits };
    }
    console.warn(
      `[WhatsApp client — ${logLabel}] Template échoué (${result.error}), essai texte:`,
      result.reason
    );
  }

  const result = await sendWhatsAppText(toDigits, message);
  if (result.sent) {
    console.log(`[WhatsApp client — ${logLabel}] Message envoyé → ${toDigits}`);
  } else {
    console.error(`[WhatsApp client — ${logLabel}] Échec → ${toDigits}:`, result.error || result.reason);
  }

  return { ...result, phone: toDigits };
}

async function notifyShopOrderClientWhatsApp(order) {
  const phone = order?.customer?.phone;
  const message = buildShopOrderClientMessage(order);
  return sendClientWhatsAppMessage({ phone, message, logLabel: 'Shop' });
}

async function notifyCommandeClientWhatsApp(commande, restaurant) {
  const phone =
    commande?.adresseLivraison?.telephoneContact ||
    (typeof commande.client === 'object' && (commande.client?.telephone || commande.client?.phone)) ||
    '';
  const message = buildCommandeClientMessage(commande, restaurant);
  return sendClientWhatsAppMessage({ phone, message, logLabel: 'App' });
}

module.exports = {
  notifyShopOrderClientWhatsApp,
  notifyCommandeClientWhatsApp,
  buildShopOrderClientMessage,
  buildCommandeClientMessage,
  isClientAutoMessageEnabled,
};
