const { sendCustomFormNotification } = require('../utils/mailer');
const { recipientsFor } = require('../utils/notificationRecipients');

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cfa = (n) => `CFA${Math.round(Number(n) || 0).toLocaleString('fr-FR')}`;

/** E-mail aux adresses « repas » ajoutées au dashboard (aucune par défaut → rien n'est envoyé). */
async function notifyMealOrderCreated(order) {
  const to = await recipientsFor('repas');
  if (!to.length || !order) return { sent: false };
  const c = order.customer || {};
  const lines = (order.items || []).map((i) => `${i.productName} ×${i.quantity}`);
  const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  const subject = `[Rapido Repas] Nouvelle commande ${order.orderNumber || ''} — ${name}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="color:#381808">Nouvelle commande repas ${esc(order.orderNumber)}</h2>
    <p><strong>${esc(name)}</strong> · ${esc(c.phone)}<br/>${esc(c.city)} — ${esc(c.addressDescription)}</p>
    <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p>Livraison : ${cfa(order.deliveryFee)} · <strong>Total : ${cfa(order.totalPrice)}</strong></p></div>`;
  const text = [subject, `${name} ${c.phone}`, `${c.city} — ${c.addressDescription}`, ...lines, `Total: ${cfa(order.totalPrice)}`].join('\n');
  return sendCustomFormNotification({ to, subject, text, html });
}

module.exports = { notifyMealOrderCreated };
