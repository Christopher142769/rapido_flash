const { normalizeBeninPhoneDigits } = require('../utils/phoneDigits');
const {
  isWhatsAppCloudConfigured,
  checkWhatsAppContact,
  sendWhatsAppText,
  sendWhatsAppTemplate,
} = require('./whatsappCloudApi');

const RAPIDO_WA_DISPLAY = '+229 40 31 75 68';
const DELIVERY_NOTE =
  'Commande aujourd’hui → livraison demain. Restez joignable à l’adresse indiquée.';

function isClientAutoMessageEnabled() {
  return process.env.WHATSAPP_CLIENT_AUTO_MESSAGE !== 'false';
}

function formatCfa(amount) {
  const n = Math.round(Number(amount) || 0);
  return `CFA${n.toLocaleString('fr-FR')}`;
}

function firstNameFrom(fullName) {
  const part = String(fullName || '').trim().split(/\s+/)[0];
  return part || 'Client';
}

function buildShopOrderClientMessage(order) {
  const c = order.customer || {};
  const name = firstNameFrom([c.firstName, c.lastName].filter(Boolean).join(' '));
  const address = [c.city, c.addressDescription].filter(Boolean).join(' — ');
  const ref = order.orderNumber || (order._id ? String(order._id).slice(-8).toUpperCase() : '');
  const lines = [
    `Bonjour ${name}`,
    '',
    '*Commande confirmée — Rapido Flash*',
    '',
    'Votre commande est bien enregistrée et validée par notre équipe.',
    '',
    `*${order.productName || 'Produit'}*`,
    `Quantité : ${order.quantityLabel || order.quantity}`,
  ];

  if (order.freeDelivery) {
    lines.push('Livraison : *gratuite* (offre en cours)');
  } else if (Number(order.deliveryFee) > 0) {
    lines.push(`Livraison : ${formatCfa(order.deliveryFee)}`);
  }

  if (Number(order.eviscerationFee) > 0) {
    lines.push(`Éviscération et nettoyage : ${formatCfa(order.eviscerationFee)}`);
  }

  lines.push(`*Total à payer : ${formatCfa(order.totalPrice)}*`);
  lines.push('');
  if (address) lines.push(`Livraison : ${address}`);
  if (ref) lines.push(`Réf. : ${ref}`);
  lines.push('');
  lines.push('*Livraison demain* (sous 24 h)');
  lines.push('Restez joignable sur WhatsApp à l’adresse indiquée.');
  lines.push('');
  lines.push('— Équipe Rapido Flash');

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

function buildShopOrderTemplateParams(order) {
  const c = order.customer || {};
  const name = firstNameFrom([c.firstName, c.lastName].filter(Boolean).join(' '));
  const address = [c.city, c.addressDescription].filter(Boolean).join(' — ');
  let deliveryLine = 'Gratuite';
  if (!order.freeDelivery && Number(order.deliveryFee) > 0) {
    deliveryLine = formatCfa(order.deliveryFee);
  } else if (!order.freeDelivery && Number(order.deliveryFee) === 0) {
    deliveryLine = 'Incluse';
  }
  return [
    name,
    String(order.productName || 'Produit').slice(0, 120),
    String(order.quantityLabel || order.quantity || '—').slice(0, 60),
    formatCfa(order.totalPrice),
    `${deliveryLine} · ${address}`.slice(0, 180),
    String(order.orderNumber || order._id || '—').slice(0, 40),
  ];
}

function buildCommandeTemplateParams(commande, restaurant) {
  const client = commande.client;
  const clientName =
    (typeof client === 'object' && client?.nom) || commande.clientName || 'Client';
  const name = firstNameFrom(clientName);
  const restoName = restaurant?.nom || 'Rapido Flash';
  const addr = commande.adresseLivraison || {};
  const addressLine = [addr.adresse, addr.instruction].filter(Boolean).join(' — ');

  const items = [];
  for (const item of commande.plats || []) {
    const plat = item.plat;
    items.push(`${typeof plat === 'object' ? plat?.nom : 'Plat'} x${item.quantite}`);
  }
  for (const item of commande.produits || []) {
    const produit = item.produit;
    items.push(`${typeof produit === 'object' ? produit?.nom : 'Produit'} x${item.quantite}`);
  }

  const deliveryLine =
    Number(commande.fraisLivraison) > 0
      ? formatCfa(commande.fraisLivraison)
      : 'Incluse';

  return [
    name,
    restoName.slice(0, 120),
    (items.join(', ') || 'Voir application').slice(0, 120),
    formatCfa(commande.total),
    `${deliveryLine} · ${addressLine}`.slice(0, 180),
    String(commande._id || '—').slice(-8),
  ];
}

function buildTemplateBodyComponents(params) {
  return [
    {
      type: 'body',
      parameters: params.map((text) => ({
        type: 'text',
        text: String(text ?? '—').slice(0, 1024),
      })),
    },
  ];
}

async function sendClientWhatsAppMessage({ phone, message, templateParams, logLabel }) {
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
    const components = templateParams?.length
      ? buildTemplateBodyComponents(templateParams)
      : undefined;
    const result = await sendWhatsAppTemplate(toDigits, templateName, lang, components);
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
  const templateParams = buildShopOrderTemplateParams(order);
  return sendClientWhatsAppMessage({ phone, message, templateParams, logLabel: 'Shop' });
}

async function notifyCommandeClientWhatsApp(commande, restaurant) {
  const phone =
    commande?.adresseLivraison?.telephoneContact ||
    (typeof commande.client === 'object' && (commande.client?.telephone || commande.client?.phone)) ||
    '';
  const message = buildCommandeClientMessage(commande, restaurant);
  const templateParams = buildCommandeTemplateParams(commande, restaurant);
  return sendClientWhatsAppMessage({ phone, message, templateParams, logLabel: 'App' });
}

/** Test manuel : node scripts/testWhatsAppClient.js 97123456 */
async function testClientWhatsApp(phone) {
  const sampleOrder = {
    orderNumber: 'RF-TEST',
    productName: 'Produit test',
    quantityLabel: '1',
    subtotalPrice: 5000,
    deliveryFee: 500,
    totalPrice: 5500,
    customer: {
      firstName: 'Test',
      lastName: 'Rapido',
      phone,
      city: 'Cotonou',
      addressDescription: 'Quartier test',
    },
  };
  return notifyShopOrderClientWhatsApp(sampleOrder);
}

module.exports = {
  notifyShopOrderClientWhatsApp,
  notifyCommandeClientWhatsApp,
  buildShopOrderClientMessage,
  buildCommandeClientMessage,
  buildShopOrderTemplateParams,
  buildCommandeTemplateParams,
  testClientWhatsApp,
  isClientAutoMessageEnabled,
};
