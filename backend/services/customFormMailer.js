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

async function notifyFormSubmission({ form, submission }) {
  const emails = (form.notifyEmails || []).filter(Boolean);
  if (!emails.length) return { sent: false, reason: 'no_recipients' };

  const subject = `[Rapido] Nouvelle réponse — ${form.title}`;
  const html = `
    <h2 style="color:#8b4513">Nouvelle réponse au formulaire</h2>
    <p><strong>Formulaire :</strong> ${escapeHtml(form.title)}</p>
    <p><strong>Nom :</strong> ${escapeHtml(submission.respondentName || '—')}</p>
    <p><strong>Email :</strong> ${escapeHtml(submission.respondentEmail || '—')}</p>
    <hr/>
    ${buildAnswersHtml(submission.answers)}
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
  });
}

module.exports = { notifyFormSubmission, buildAnswersHtml };
