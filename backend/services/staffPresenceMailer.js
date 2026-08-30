const { sendStaffPresenceNotification } = require('../utils/mailer');
const { siteLabel } = require('../utils/staffPresenceSites');
const { shiftLabel, formatMinutesLabel, TZ } = require('../utils/staffPresenceShifts');
const { readSelfieBuffer, publicSelfieUrl } = require('../utils/staffPresenceSelfie');

const DEFAULT_NOTIFY = [
  'cricriguidibi@gmail.com',
  'florencechanca@gmail.com',
  'christopherguidibi@gmail.com',
];

function notifyRecipients() {
  const raw = String(process.env.STAFF_PRESENCE_NOTIFY_EMAILS || '').trim();
  if (raw) {
    return raw
      .split(/[,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_NOTIFY;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCheckedAt(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('fr-FR', {
      timeZone: TZ,
      dateStyle: 'full',
      timeStyle: 'medium',
    });
  } catch {
    return '—';
  }
}

/**
 * Alerte email à chaque arrivée ou sortie enregistrée (avec selfie en pièce jointe).
 */
async function notifyPresenceRecorded({ record, arrivalRecord = null }) {
  const emails = notifyRecipients();
  if (!emails.length || !record) return { sent: false, reason: 'no_recipients' };

  const kind = record.kind === 'exit' ? 'exit' : 'arrival';
  const kindLabel = kind === 'exit' ? 'Sortie' : 'Arrivée';
  const fullName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
  const site = siteLabel(record.siteId);
  const plage = shiftLabel(record.shift);
  const checkedLabel = formatCheckedAt(record.checkedAt);
  const arrivalLabel = arrivalRecord ? formatCheckedAt(arrivalRecord.checkedAt) : null;

  const subject =
    kind === 'exit'
      ? `[Présence] Sortie — ${fullName} — ${site} — ${plage}`
      : `[Présence] Arrivée — ${fullName} — ${site} — ${plage}`;

  const selfieBuf = await readSelfieBuffer(record.selfieUrl);
  const selfiePublic = publicSelfieUrl(record.selfieUrl);
  const attachments = [];
  let selfieHtml = '';

  if (selfieBuf?.length) {
    attachments.push({
      filename: `selfie-${record.dateKey || 'presence'}.jpg`,
      content: selfieBuf,
      cid: 'presence-selfie',
    });
    selfieHtml =
      '<p><strong>Selfie :</strong></p><p><img src="cid:presence-selfie" alt="Selfie" style="max-width:340px;border-radius:12px;border:1px solid #ddd;" /></p>';
  } else if (selfiePublic) {
    selfieHtml = `<p><strong>Selfie :</strong><br/><a href="${escapeHtml(selfiePublic)}">Voir la photo</a></p>`;
  }

  const overtimeBlock =
    kind === 'exit' && record.overtimeMinutes > 0
      ? `<p style="color:#b45309"><strong>Heures supplémentaires :</strong> ${escapeHtml(formatMinutesLabel(record.overtimeMinutes))}</p>`
      : '';

  const durationBlock =
    kind === 'exit' && record.workedMinutes != null
      ? `<p><strong>Durée travaillée :</strong> ${escapeHtml(formatMinutesLabel(record.workedMinutes))}</p>`
      : '';

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1c1712;max-width:560px">
      <h2 style="color:#381808;margin:0 0 12px">${kindLabel} enregistrée</h2>
      <p style="margin:0 0 16px;color:#564c40">Alerte présence personnel King Fish</p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
        <tr><td style="padding:8px 0;color:#666;width:140px">Personnel</td><td><strong>${escapeHtml(fullName)}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#666">Site</td><td>${escapeHtml(site)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Type</td><td>${escapeHtml(kindLabel)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Plage horaire</td><td>${escapeHtml(plage)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Date</td><td>${escapeHtml(record.dateKey || '—')}</td></tr>
        <tr><td style="padding:8px 0;color:#666">${kind === 'exit' ? 'Heure de sortie' : 'Heure d’arrivée'}</td><td><strong>${escapeHtml(checkedLabel)}</strong></td></tr>
        ${
          kind === 'exit' && arrivalLabel
            ? `<tr><td style="padding:8px 0;color:#666">Heure d’arrivée</td><td>${escapeHtml(arrivalLabel)}</td></tr>`
            : ''
        }
      </table>
      ${durationBlock}
      ${overtimeBlock}
      ${selfieHtml}
      <p style="color:#888;font-size:12px;margin-top:24px">— Rapido Flash · Présence personnel</p>
    </div>
  `;

  const textLines = [
    `${kindLabel} enregistrée`,
    `Personnel: ${fullName}`,
    `Site: ${site}`,
    `Plage: ${plage}`,
    `Date: ${record.dateKey || '—'}`,
    kind === 'exit' ? `Sortie: ${checkedLabel}` : `Arrivée: ${checkedLabel}`,
  ];
  if (kind === 'exit' && arrivalLabel) textLines.push(`Arrivée: ${arrivalLabel}`);
  if (record.workedMinutes != null) textLines.push(`Durée: ${formatMinutesLabel(record.workedMinutes)}`);
  if (record.overtimeMinutes > 0) {
    textLines.push(`Heures sup.: ${formatMinutesLabel(record.overtimeMinutes)}`);
  }
  if (selfiePublic) textLines.push(`Photo: ${selfiePublic}`);

  return sendStaffPresenceNotification({
    to: emails,
    subject,
    html,
    text: textLines.join('\n'),
    attachments,
  });
}

module.exports = { notifyPresenceRecorded, notifyRecipients };
