const { sendCustomFormNotification } = require('../utils/mailer');
const { getPlatformAdminEmails } = require('../utils/maintenanceAccess');
const { notifyOrderWhatsApp } = require('./orderNotificationWhatsApp');
const {
  notifyCommandeClientWhatsApp,
} = require('./customerOrderWhatsApp');

/** Si PLATFORM_ADMIN_EMAIL est vide (dev local). */
const FALLBACK_ORDER_NOTIFY_EMAIL = 'rapido002026@gmail.com';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCfa(amount) {
  const n = Math.round(Number(amount) || 0);
  return `CFA${n.toLocaleString('fr-FR')}`;
}

function getOrderNotifyRecipients() {
  const fromEnv = getPlatformAdminEmails();
  if (fromEnv.length) return fromEnv;
  return [FALLBACK_ORDER_NOTIFY_EMAIL];
}

function getDashboardCommandesUrl() {
  const base = (
    process.env.FRONTEND_URL_1 ||
    process.env.FRONTEND_URL ||
    process.env.DASHBOARD_URL ||
    'https://rapido.bj'
  ).replace(/\/$/, '');
  return `${base}/dashboard/commandes`;
}

const MODE_PAIEMENT_LABELS = {
  especes: 'Espèces à la livraison',
  momo_avant: 'Mobile Money (avant livraison)',
  momo_apres: 'Mobile Money (après livraison)',
};

async function sendToOrderInbox({ subject, html, text }) {
  const to = getOrderNotifyRecipients();
  return sendCustomFormNotification({ to, subject, text, html });
}

/**
 * Notification e-mail — commande Shop express (/shop/:slug).
 */
async function notifyShopOrderCreated(order) {
  const c = order.customer || {};
  const clientName = [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Client';
  const address = [c.city, c.addressDescription].filter(Boolean).join(' — ');
  const dashUrl = getDashboardCommandesUrl();

  const subject = `[Rapido Shop] Nouvelle commande — ${order.productName}`;
  const html = `
    <h2 style="color:#c76d2e;margin:0 0 12px">Nouvelle commande Shop express</h2>
    <p><strong>Produit :</strong> ${escapeHtml(order.productName)}</p>
    <p><strong>Quantité :</strong> ${escapeHtml(order.quantityLabel || order.quantity)}</p>
    <p><strong>Sous-total :</strong> ${escapeHtml(formatCfa(order.subtotalPrice ?? order.totalPrice))}</p>
    ${order.freeDelivery ? '<p><strong>Livraison :</strong> gratuite (offre en cours)</p>' : Number(order.deliveryFee) > 0 ? `<p><strong>Frais de livraison :</strong> ${escapeHtml(formatCfa(order.deliveryFee))}</p>` : ''}
    <p><strong>Total à payer :</strong> ${escapeHtml(formatCfa(order.totalPrice))}</p>
    ${order.isPromoLive ? `<p><strong>Promo :</strong> −${order.discountPercent || 0}%</p>` : ''}
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <p><strong>Client :</strong> ${escapeHtml(clientName)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(c.phone)}</p>
    <p><strong>Livraison :</strong> ${escapeHtml(address)}</p>
    ${order.whatsappNumber ? `<p><strong>WhatsApp produit :</strong> ${escapeHtml(order.whatsappNumber)}</p>` : ''}
    <p style="margin-top:20px"><a href="${escapeHtml(dashUrl)}" style="color:#c76d2e;font-weight:700">Ouvrir le dashboard Commandes</a></p>
    <p style="color:#666;font-size:12px;margin-top:24px">Réf. ${escapeHtml(String(order._id))} — Rapido Flash</p>
  `;
  const text = [
    '🛒 Nouvelle commande Shop express',
    '',
    `Produit: ${order.productName}`,
    `Quantité: ${order.quantityLabel || order.quantity}`,
    `Sous-total: ${formatCfa(order.subtotalPrice ?? order.totalPrice)}`,
    order.freeDelivery
      ? 'Livraison: gratuite'
      : Number(order.deliveryFee) > 0
        ? `Frais de livraison: ${formatCfa(order.deliveryFee)}`
        : null,
    `Total à payer: ${formatCfa(order.totalPrice)}`,
    order.isPromoLive ? `Promo: −${order.discountPercent || 0}%` : null,
    '',
    `Client: ${clientName}`,
    `Tél: ${c.phone}`,
    `Livraison: ${address}`,
    '',
    `Dashboard: ${dashUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  void notifyOrderWhatsApp(text).catch((err) => {
    console.error('Notification WhatsApp commande Shop:', err.message);
  });

  // Confirmation client : après « Suivre ma commande » (webhook ou délai), pas à la création.

  return sendToOrderInbox({ subject, html, text });
}

function formatCommandeLines(commande) {
  const lines = [];
  for (const item of commande.plats || []) {
    const plat = item.plat;
    const nom = typeof plat === 'object' ? plat?.nom : 'Plat';
    lines.push(`• ${nom} × ${item.quantite} — ${formatCfa((item.prix || 0) * item.quantite)}`);
  }
  for (const item of commande.produits || []) {
    const produit = item.produit;
    const nom = typeof produit === 'object' ? produit?.nom : 'Produit';
    lines.push(`• ${nom} × ${item.quantite} — ${formatCfa((item.prix || 0) * item.quantite)}`);
  }
  return lines.length ? lines.join('<br/>') : '<em>Aucun détail article</em>';
}

/**
 * Notification e-mail — commande app (restaurant / marketplace).
 */
async function notifyCommandeCreated(commande, restaurant) {
  const restoName = restaurant?.nom || 'Structure';
  const client = commande.client;
  const clientName =
    (typeof client === 'object' && client?.nom) || commande.clientName || 'Client';
  const clientPhone =
    (typeof client === 'object' && (client?.telephone || client?.phone)) ||
    commande.adresseLivraison?.telephoneContact ||
    '';
  const addr = commande.adresseLivraison || {};
  const addressLine = [addr.adresse, addr.instruction].filter(Boolean).join(' — ');
  const modeLabel = MODE_PAIEMENT_LABELS[commande.modePaiement] || commande.modePaiement || '—';
  const dashUrl = getDashboardCommandesUrl();

  const subject = `[Rapido] Nouvelle commande — ${restoName}`;
  const html = `
    <h2 style="color:#c76d2e;margin:0 0 12px">Nouvelle commande application</h2>
    <p><strong>Structure :</strong> ${escapeHtml(restoName)}</p>
    <p><strong>Total :</strong> ${escapeHtml(formatCfa(commande.total))}</p>
    <p><strong>Sous-total :</strong> ${escapeHtml(formatCfa(commande.sousTotal))} · <strong>Livraison :</strong> ${escapeHtml(formatCfa(commande.fraisLivraison))}</p>
    ${commande.promoCode ? `<p><strong>Code promo :</strong> ${escapeHtml(commande.promoCode)} (−${formatCfa(commande.promoDiscountAmount)})</p>` : ''}
    <p><strong>Paiement :</strong> ${escapeHtml(modeLabel)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <p><strong>Articles :</strong><br/>${formatCommandeLines(commande)}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <p><strong>Client :</strong> ${escapeHtml(clientName)}</p>
    <p><strong>Téléphone livraison :</strong> ${escapeHtml(clientPhone)}</p>
    <p><strong>Adresse :</strong> ${escapeHtml(addressLine)}</p>
    <p style="margin-top:20px"><a href="${escapeHtml(dashUrl)}" style="color:#c76d2e;font-weight:700">Ouvrir le dashboard Commandes</a></p>
    <p style="color:#666;font-size:12px;margin-top:24px">Réf. ${escapeHtml(String(commande._id))} — Rapido Flash</p>
  `;
  const itemsText = formatCommandeLines(commande)
    .replace(/<br\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/• /g, '- ');

  const text = [
    '🛒 Nouvelle commande application',
    '',
    `Structure: ${restoName}`,
    `Total: ${formatCfa(commande.total)}`,
    `Paiement: ${modeLabel}`,
    '',
    'Articles:',
    itemsText,
    '',
    `Client: ${clientName}`,
    `Tél: ${clientPhone}`,
    `Adresse: ${addressLine}`,
    '',
    `Dashboard: ${dashUrl}`,
  ].join('\n');

  void notifyOrderWhatsApp(text).catch((err) => {
    console.error('Notification WhatsApp commande app:', err.message);
  });

  void notifyCommandeClientWhatsApp(commande, restaurant).catch((err) => {
    console.error('WhatsApp client commande app:', err.message);
  });

  return sendToOrderInbox({ subject, html, text });
}

module.exports = {
  getOrderNotifyRecipients, // alias : destinataires = PLATFORM_ADMIN_EMAIL
  notifyShopOrderCreated,
  notifyCommandeCreated,
};
