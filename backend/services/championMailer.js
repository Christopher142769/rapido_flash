const { sendCustomFormNotification } = require('../utils/mailer');
const { getPlatformAdminEmails } = require('../utils/maintenanceAccess');

const FALLBACK_ADMIN_EMAIL = 'rapido002026@gmail.com';

function adminRecipients() {
  const fromEnv = getPlatformAdminEmails();
  if (fromEnv.length) return fromEnv;
  return [FALLBACK_ADMIN_EMAIL];
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendChampionOtp(email, code) {
  const subject = 'Votre code de vérification Champion Rapido Flash';
  const html = `
    <p>Bonjour,</p>
    <p>Votre code de vérification est : <strong style="font-size:22px;letter-spacing:3px;">${code}</strong></p>
    <p>Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.</p>
    <p>— L'équipe Rapido Flash Champions</p>
  `;
  const text = `Code Champion Rapido Flash : ${code}. Valide 10 minutes.`;
  return sendCustomFormNotification({ to: email, subject, text, html });
}

async function notifyAdminNewChampionApplication(champion) {
  const name = [champion.firstName, champion.lastName].filter(Boolean).join(' ').trim() || 'Livreur';
  const base = (
    process.env.FRONTEND_URL_1 ||
    process.env.FRONTEND_URL ||
    'https://rapido.bj'
  ).replace(/\/$/, '');
  const dashUrl = `${base}/dashboard/champions`;
  const subject = `[Champion] Nouvelle candidature — ${name}`;
  const html = `
    <h2 style="color:#c76d2e;margin:0 0 12px">Nouvelle candidature livreur</h2>
    <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
    <p><strong>Email :</strong> ${escapeHtml(champion.email)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(champion.phone)}</p>
    <p><strong>Zone :</strong> ${escapeHtml(champion.workZone)}</p>
    <p><strong>Véhicule :</strong> ${escapeHtml(champion.vehicleType)}</p>
    <p><strong>MoMo :</strong> ${escapeHtml(champion.momoNetwork)} — ${escapeHtml(champion.momoNumber)} (${escapeHtml(champion.momoAccountName)})</p>
    <p style="margin-top:20px"><a href="${escapeHtml(dashUrl)}" style="color:#c76d2e;font-weight:700">Examiner le dossier</a></p>
    <p style="color:#666;font-size:12px;margin-top:24px">Réf. ${escapeHtml(String(champion._id))}</p>
  `;
  const text = [
    'Nouvelle candidature livreur Champion',
    `Nom : ${name}`,
    `Email : ${champion.email}`,
    `Zone : ${champion.workZone}`,
    `Dashboard : ${dashUrl}`,
  ].join('\n');
  return sendCustomFormNotification({ to: adminRecipients(), subject, text, html });
}

async function notifyClientDeliveryCode({ email, clientName, deliveryCode, productSummary, deliveryAddress, reviewUrl }) {
  if (!email) return { sent: false, error: 'no_email' };

  const subject = 'Votre code de livraison Rapido Flash';
  const html = `
    <h2 style="color:#c76d2e;margin:0 0 12px">Code de livraison</h2>
    <p>Bonjour ${escapeHtml(clientName || 'Client')},</p>
    <p>Votre commande <strong>${escapeHtml(productSummary)}</strong> est en cours de préparation.</p>
    <p>À la livraison, communiquez ce code au livreur :</p>
    <p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#c76d2e;margin:16px 0">${escapeHtml(deliveryCode)}</p>
    <p><strong>Adresse :</strong> ${escapeHtml(deliveryAddress)}</p>
    <p style="color:#666;font-size:13px">Ne partagez ce code qu’avec le livreur Rapido présent devant vous.</p>
    ${reviewUrl ? `<p style="margin-top:20px">Après réception, notez votre livreur : <a href="${escapeHtml(reviewUrl)}" style="color:#c76d2e">Laisser un avis</a></p>` : ''}
    <p style="margin-top:24px">— Rapido Flash</p>
  `;
  const text = [
    `Code de livraison Rapido : ${deliveryCode}`,
    `Commande : ${productSummary}`,
    `Adresse : ${deliveryAddress}`,
    reviewUrl ? `Avis livreur : ${reviewUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return sendCustomFormNotification({ to: email, subject, text, html });
}

async function notifyChampionsNewMission(champions, mission) {
  const emails = champions.map((c) => c.email).filter(Boolean);
  if (!emails.length) return { sent: false };

  const subject = `[Champion] Nouvelle course disponible — ${mission.workZone}`;
  const earnings = Math.round(Number(mission.earnings) || 0).toLocaleString('fr-FR');
  const html = `
    <h2 style="color:#c76d2e;margin:0 0 12px">Nouvelle course disponible</h2>
    <p><strong>Zone :</strong> ${escapeHtml(mission.workZone)}</p>
    <p><strong>Retrait :</strong> ${escapeHtml(mission.pickupLabel)} — ${escapeHtml(mission.pickupAddress)}</p>
    <p><strong>Livraison :</strong> ${escapeHtml(mission.deliveryLabel)} — ${escapeHtml(mission.deliveryAddress)}</p>
    <p><strong>Gain estimé :</strong> CFA ${escapeHtml(earnings)}</p>
    <p style="margin-top:16px">Connectez-vous à l'app Champion et passez <strong>en ligne</strong> pour accepter la course.</p>
  `;
  const text = [
    'Nouvelle course Champion disponible',
    `Zone : ${mission.workZone}`,
    `Retrait : ${mission.pickupAddress}`,
    `Livraison : ${mission.deliveryAddress}`,
    `Gain : CFA ${earnings}`,
  ].join('\n');

  return sendCustomFormNotification({ to: emails, subject, text, html });
}

module.exports = {
  sendChampionOtp,
  notifyAdminNewChampionApplication,
  notifyClientDeliveryCode,
  notifyChampionsNewMission,
};
