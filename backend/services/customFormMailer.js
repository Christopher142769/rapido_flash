const { sendCustomFormNotification } = require('../utils/mailer');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildAnswersHtml(answers) {
  if (!answers?.length) return '<p><em>Aucune réponse</em></p>';
  return answers
    .map((a) => {
      const label = escapeHtml(a.label || 'Champ');
      if (a.tableRows?.length) {
        const cols = a.tableRows[0]?.length || 0;
        const rows = a.tableRows
          .map(
            (row) =>
              `<tr>${row.map((c) => `<td style="border:1px solid #ddd;padding:6px">${escapeHtml(c)}</td>`).join('')}</tr>`
          )
          .join('');
        return `<div style="margin-bottom:16px"><strong>${label}</strong><table style="border-collapse:collapse;margin-top:8px">${rows}</table></div>`;
      }
      const attachments =
        a.fileAttachments?.length > 0
          ? a.fileAttachments
          : a.fileUrl
            ? [{ fileUrl: a.fileUrl, fileName: a.fileName }]
            : [];
      if (attachments.length) {
        const links = attachments
          .map((f) => {
            const link = escapeHtml(f.fileUrl);
            const name = escapeHtml(f.fileName || 'Fichier');
            return `<a href="${link}">${name}</a>`;
          })
          .join('<br/>');
        return `<div style="margin-bottom:12px"><strong>${label}</strong><br/>${links}</div>`;
      }
      if (a.selectedValues?.length) {
        const list = a.selectedValues.map((v) => escapeHtml(v)).join('<br/>');
        return `<div style="margin-bottom:12px"><strong>${label}</strong><br/>${list}</div>`;
      }
      const val = escapeHtml(a.textValue || '—');
      return `<div style="margin-bottom:12px"><strong>${label}</strong><br/>${val.replace(/\n/g, '<br/>')}</div>`;
    })
    .join('');
}

/** Gmail refuse au-delà de ~25 Mo : on joint les fichiers tant que le total reste sous 18 Mo. */
const MAX_ATTACH_BYTES = 18 * 1024 * 1024;

function pickAttachments(list) {
  let total = 0;
  const kept = [];
  for (const a of list || []) {
    const size = a.content?.length || 0;
    if (!size || total + size > MAX_ATTACH_BYTES) continue;
    total += size;
    kept.push(a);
  }
  return kept;
}

async function notifyFormSubmission({ form, submission, extraRecipients = [], attachments = [] }) {
  const emails = [
    ...new Set([...(form.notifyEmails || []), ...extraRecipients].map((e) => String(e).trim().toLowerCase()).filter(Boolean)),
  ];
  if (!emails.length) return { sent: false, reason: 'no_recipients' };

  const slug = String(form.slug || '').toLowerCase();
  const isBassins = slug.includes('bassin');
  const isCandidature = slug.startsWith('candidature-');
  const name = String(submission.respondentName || '').trim() || 'Prospect';
  const subject = isBassins
    ? `🔥 LEAD BASSIN HOT — ${name} vient de demander son devis Rapido`
    : isCandidature
      ? `[Rapido] ${form.title} — ${name}`
      : `[Rapido] Nouvelle réponse — ${form.title}`;
  const joined = pickAttachments(attachments);
  const html = `
    <h2 style="color:#381808">${isBassins ? 'Nouvelle demande bassin (chaud)' : 'Nouvelle réponse au formulaire'}</h2>
    <p><strong>Formulaire :</strong> ${escapeHtml(form.title)}</p>
    <p><strong>Nom :</strong> ${escapeHtml(submission.respondentName || '—')}</p>
    <p><strong>Email :</strong> ${escapeHtml(submission.respondentEmail || '—')}</p>
    <hr/>
    ${buildAnswersHtml(submission.answers)}
    ${joined.length ? `<p style="color:#381808"><strong>📎 ${joined.length} fichier(s) joint(s) à cet e-mail.</strong></p>` : ''}
    <p style="color:#666;font-size:12px;margin-top:24px">— Rapido Flash</p>
  `;
  const textLines = [
    `Formulaire: ${form.title}`,
    `Nom: ${submission.respondentName || '—'}`,
    `Email: ${submission.respondentEmail || '—'}`,
    '',
    ...(submission.answers || []).map((a) => {
      if (a.tableRows?.length) {
        return `${a.label}:\n${a.tableRows.map((r) => r.join(' | ')).join('\n')}`;
      }
      if (a.fileAttachments?.length) {
        return `${a.label}: ${a.fileAttachments.map((f) => f.fileUrl).join(', ')}`;
      }
      if (a.fileUrl) return `${a.label}: ${a.fileUrl}`;
      if (a.selectedValues?.length) return `${a.label}: ${a.selectedValues.join(', ')}`;
      return `${a.label}: ${a.textValue || '—'}`;
    }),
  ];

  return sendCustomFormNotification({
    to: emails,
    subject,
    html,
    text: textLines.join('\n'),
    attachments: joined,
  });
}

module.exports = { notifyFormSubmission, buildAnswersHtml };
