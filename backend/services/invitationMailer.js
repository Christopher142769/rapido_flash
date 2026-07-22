const { sendInvitationEmail } = require('../utils/mailer');
const { buildInvitationLetterPdf, safePdfFilename } = require('./invitationLetterPdf');

async function sendInvitationLetterToGuest(invitation, options = {}) {
  const email = String(invitation.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { sent: false, error: 'email_missing' };
  }

  const pdfBuffer = await buildInvitationLetterPdf(invitation);
  const filename = safePdfFilename(invitation.fullName);
  const subject =
    options.subject ||
    process.env.INVITATION_EMAIL_SUBJECT ||
    'Invitation — Cérémonie de lancement STARTUP FAIRPLAY';

  const greeting = String(invitation.fullName || '').trim() || 'Madame, Monsieur';
  const html = `
    <p>Bonjour ${greeting},</p>
    <p>Veuillez trouver ci-joint votre lettre d'invitation personnalisée avec votre QR code de présence.</p>
    <p>Présentez ce QR code le jour de l'événement pour valider votre participation.</p>
    <p>— Comité d'organisation STARTUP FAIRPLAY</p>
  `;
  const text = `Bonjour ${greeting},\n\nVeuillez trouver ci-joint votre lettre d'invitation avec QR code de présence.\n\n— Comité d'organisation STARTUP FAIRPLAY`;

  const result = await sendInvitationEmail({
    to: email,
    subject,
    text,
    html,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return result;
}

module.exports = { sendInvitationLetterToGuest };
