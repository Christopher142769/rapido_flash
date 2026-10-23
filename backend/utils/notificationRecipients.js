const NotificationRecipient = require('../models/NotificationRecipient');
const { getPlatformAdminEmails } = require('./maintenanceAccess');

const DEFAULT_PRESENCE = ['florencechanca@gmail.com', 'christopherguidibi@gmail.com'];

/** Adresses par défaut (non supprimables depuis le dashboard). */
function defaultRecipients(channel) {
  const raw = String(process.env.STAFF_PRESENCE_NOTIFY_EMAILS || '').trim();
  const staff = raw ? raw.split(/[,;]/).map((e) => e.trim().toLowerCase()).filter(Boolean) : DEFAULT_PRESENCE;
  if (channel === 'presence' || channel === 'livreur') return staff;
  // Commandes (repas, shop, plateforme) : l'équipe + les admins plateforme (ou l'adresse historique).
  const admins = getPlatformAdminEmails().map((e) => e.toLowerCase());
  return [...new Set([...staff, ...(admins.length ? admins : ['rapido002026@gmail.com'])])];
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
