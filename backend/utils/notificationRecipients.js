const NotificationRecipient = require('../models/NotificationRecipient');

const DEFAULT_PRESENCE = ['florencechanca@gmail.com', 'christopherguidibi@gmail.com'];

/** Adresses par défaut (non supprimables depuis le dashboard). */
function defaultRecipients(channel) {
  if (channel === 'presence' || channel === 'livreur') {
    const raw = String(process.env.STAFF_PRESENCE_NOTIFY_EMAILS || '').trim();
    return raw
      ? raw.split(/[,;]/).map((e) => e.trim().toLowerCase()).filter(Boolean)
      : DEFAULT_PRESENCE;
  }
  return []; // repas : uniquement les adresses ajoutées
}

async function recipientsFor(channel) {
  let extra = [];
  try {
    extra = (await NotificationRecipient.find({ channel }).lean()).map((r) => r.email);
  } catch (e) {
    console.error('Destinataires e-mail:', e.message);
  }
  return [...new Set([...defaultRecipients(channel), ...extra])];
}

module.exports = { recipientsFor, defaultRecipients };
