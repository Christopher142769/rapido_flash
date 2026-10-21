const { sendStaffPresenceNotification } = require('../utils/mailer');
const { recipientsFor } = require('../utils/notificationRecipients');
const { siteLabel } = require('../utils/staffPresenceSites');
const { TZ } = require('../utils/staffPresenceShifts');

const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmt = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { timeZone: TZ, dateStyle: 'full', timeStyle: 'medium' }) : '—';

function fmtDuration(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min ${s} s`;
}

const geoLine = (g) =>
  g
    ? `${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}${g.accuracy != null ? ` (±${g.accuracy} m)` : ''}${
        g.distanceM != null ? ` — ${g.distanceM} m du site` : ''
      }`
    : 'non transmise';

const FLAG_LABELS = {
  out_of_zone: 'Scan hors de la zone du site',
  no_geo: 'Position GPS absente',
  low_gps_accuracy: 'Précision GPS faible',
  too_short: 'Durée anormalement courte',
  too_long: 'Durée anormalement longue',
  not_clocked_in: 'Livreur non pointé à l’arrivée aujourd’hui',
  duplicate_signature: 'Signature identique à une précédente',
  weak_signature: 'Signature très sommaire',
  clock_skew: 'Heure du téléphone décalée',
  repeat_client: 'Même client très fréquent',
};

/**
 * kind: 'start' | 'end_scan' | 'signature'.
 * Envoi non bloquant (les erreurs sont journalisées par l'appelant).
 */
async function notifyLivreurEvent({ kind, delivery, signatureBuffer = null }) {
  const to = await recipientsFor('livreur');
  if (!to.length || !delivery) return { sent: false };
  const titles = {
    start: 'Début de livraison',
    end_scan: 'Scan de fin de livraison',
    signature: 'Livraison terminée — signature client',
  };
  const title = titles[kind];
  const site = siteLabel(delivery.siteId);
  const flags = (delivery.flags || []).map((f) => FLAG_LABELS[f] || f);
  const attachments = [];
  let sigHtml = '';
  if (signatureBuffer?.length) {
    attachments.push({ filename: `signature-${delivery._id}.png`, content: signatureBuffer, cid: 'client-signature' });
    sigHtml =
      '<p><strong>Signature du client :</strong></p><p><img src="cid:client-signature" alt="Signature" style="max-width:360px;background:#fff;border:1px solid #ddd;border-radius:8px" /></p>';
  }
  const rows = [
    ['Livreur', delivery.livreurName],
    ['Site', site],
    ['Début', fmt(delivery.startedAt)],
    kind !== 'start' ? ['Scan de fin', fmt(delivery.endScannedAt)] : null,
    kind === 'signature' ? ['Signature', fmt(delivery.signedAt)] : null,
    kind !== 'start' ? ['Durée', fmtDuration(delivery.durationSeconds)] : null,
    delivery.orderRef ? ['Commande / réf.', delivery.orderRef] : null,
    delivery.note ? ['Note', delivery.note] : null,
    kind === 'signature' ? ['Client', delivery.clientName] : null,
    kind === 'signature' ? ['Téléphone client', delivery.clientPhone] : null,
    ['GPS début', geoLine(delivery.startGeo)],
    kind !== 'start' ? ['GPS fin', geoLine(delivery.endGeo)] : null,
    kind === 'signature' ? ['GPS signature', geoLine(delivery.signGeo)] : null,
  ].filter(Boolean);
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1c1712;max-width:560px">
      <h2 style="color:#381808;margin:0 0 12px">${esc(title)}</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
        ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666;width:150px">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}
      </table>
      ${flags.length ? `<p style="color:#b91c1c"><strong>⚠ Alertes :</strong> ${flags.map(esc).join(' · ')}</p>` : ''}
      ${sigHtml}
      <p style="color:#888;font-size:12px;margin-top:24px">— Rapido Flash · Livreurs · Horodatage serveur</p>
    </div>`;
  const text = [title, ...rows.map(([k, v]) => `${k}: ${v}`), flags.length ? `Alertes: ${flags.join(', ')}` : '']
    .filter(Boolean)
    .join('\n');
  return sendStaffPresenceNotification({
    to,
    subject: `[Livreur] ${title} — ${delivery.livreurName} — ${site}${flags.length ? ' ⚠' : ''}`,
    html,
    text,
    attachments,
  });
}

module.exports = { notifyLivreurEvent, FLAG_LABELS };
