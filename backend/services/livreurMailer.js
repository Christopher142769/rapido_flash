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

/** Nom du lieu d'abord (quartier, commune), alentours, puis lien carte ; coordonnées en dernier recours. */
function geoHtml(g) {
  if (!g) return '<span style="color:#b91c1c">Position non transmise</span>';
  const name = g.place ? `<strong>${esc(g.place)}</strong>` : '<strong>Lieu non identifié</strong>';
  const near = g.nearby?.length ? `<br/><span style="color:#666;font-size:12px">Aux alentours : ${g.nearby.map(esc).join(' · ')}</span>` : '';
  const dist = g.distanceM != null ? `<br/><span style="color:#666;font-size:12px">${g.distanceM} m du site</span>` : '';
  const map = `<br/><a href="https://www.google.com/maps?q=${g.lat},${g.lng}" style="font-size:12px">Voir sur la carte</a>`;
  return `${name}${near}${dist}${map}`;
}

const geoText = (g) =>
  g
    ? `${g.place || 'Lieu non identifié'}${g.nearby?.length ? ` (alentours : ${g.nearby.join(', ')})` : ''} — https://www.google.com/maps?q=${g.lat},${g.lng}`
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
  const isSig = kind === 'signature';
  const title = isSig ? 'Livraison terminée — signature client' : delivery.startVia === 'app' ? 'Nouvelle livraison démarrée' : 'Début de livraison (scan du QR)';
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
    ['Livreur', esc(delivery.livreurName)],
    ['Site', esc(site)],
    ['Départ', `${esc(fmt(delivery.startedAt))}<br/>${geoHtml(delivery.startGeo)}`],
    isSig ? ['Arrivée / signature', `${esc(fmt(delivery.signedAt))}<br/>${geoHtml(delivery.signGeo)}`] : null,
    isSig ? ['Durée', esc(fmtDuration(delivery.durationSeconds))] : null,
    delivery.orderRef ? ['Commande / réf.', esc(delivery.orderRef)] : null,
    delivery.note ? ['Note', esc(delivery.note)] : null,
    isSig ? ['Client', esc(`${delivery.clientName} — ${delivery.clientPhone}`)] : null,
  ].filter(Boolean);
  const html = `
    <div style="font-family:Arial,sans-serif;color:#1c1712;max-width:560px">
      <h2 style="color:#381808;margin:0 0 12px">${esc(title)}</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
        ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#666;width:140px;vertical-align:top">${esc(k)}</td><td style="padding:8px 0">${v}</td></tr>`).join('')}
      </table>
      ${flags.length ? `<p style="color:#b91c1c"><strong>⚠ Alertes :</strong> ${flags.map(esc).join(' · ')}</p>` : ''}
      ${sigHtml}
      <p style="color:#888;font-size:12px;margin-top:24px">— Rapido Flash · Livreurs · Horodatage serveur</p>
    </div>`;
  const text = [
    title,
    `Livreur: ${delivery.livreurName}`,
    `Site: ${site}`,
    `Départ: ${fmt(delivery.startedAt)} — ${geoText(delivery.startGeo)}`,
    isSig ? `Arrivée: ${fmt(delivery.signedAt)} — ${geoText(delivery.signGeo)}` : '',
    isSig ? `Durée: ${fmtDuration(delivery.durationSeconds)}` : '',
    delivery.orderRef ? `Réf: ${delivery.orderRef}` : '',
    isSig ? `Client: ${delivery.clientName} ${delivery.clientPhone}` : '',
    flags.length ? `Alertes: ${flags.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  return sendStaffPresenceNotification({
    to,
    subject: `[Livreur] ${title} — ${delivery.livreurName}${delivery.signGeo?.place ? ` — ${delivery.signGeo.place}` : delivery.startGeo?.place ? ` — ${delivery.startGeo.place}` : ''}${flags.length ? ' ⚠' : ''}`,
    html,
    text,
    attachments,
  });
}

module.exports = { notifyLivreurEvent, FLAG_LABELS };
