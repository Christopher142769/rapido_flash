const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');

const TEMPLATE_PATH = path.join(__dirname, '../assets/invitation-letter-template.pdf');

const CIVILITIES = new Set([
  'm',
  'mr',
  'm.',
  'mme',
  'mme.',
  'mlle',
  'mlle.',
  'monsieur',
  'madame',
  'mademoiselle',
]);

function parseGuestName(fullName) {
  const raw = String(fullName || '').trim().replace(/\s+/g, ' ');
  const parts = raw.split(' ').filter(Boolean);
  if (!parts.length) {
    return { civility: '', firstName: '', lastName: '', displayName: '', signatureName: '' };
  }

  let civility = '';
  if (parts.length > 1 && CIVILITIES.has(parts[0].toLowerCase().replace(/\./g, ''))) {
    civility = parts.shift();
  }

  let firstName = '';
  let lastName = '';
  if (parts.length === 1) {
    lastName = parts[0];
    firstName = parts[0];
  } else {
    lastName = parts[parts.length - 1];
    firstName = parts.slice(0, -1).join(' ');
  }

  const displayName = [civility, firstName, lastName].filter(Boolean).join(' ').trim();
  const signatureName = `${lastName.toUpperCase()} ${firstName}`.trim();

  return { civility, firstName, lastName, displayName, signatureName };
}

function getPublicInviteUrl(code) {
  const base = String(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (base) return `${base}/invités/${code}`;
  return `https://rapido-flash.com/invités/${code}`;
}

async function loadTemplateBytes() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('Modèle PDF introuvable (backend/assets/invitation-letter-template.pdf)');
  }
  return fs.readFileSync(TEMPLATE_PATH);
}

/**
 * Masque un texte du modèle Canva et écrit le nouveau contenu.
 * Coordonnées calibrées sur Lettre_Invitation_candidat.pdf (A4).
 */
function coverAndWrite(page, font, { x, y, width, height, text, size = 10, align = 'left' }) {
  page.drawRectangle({
    x: x - 2,
    y: y - 2,
    width: width + 4,
    height: height + 6,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });

  let drawX = x;
  const textWidth = font.widthOfTextAtSize(text, size);
  if (align === 'right') drawX = x + width - textWidth;
  if (align === 'center') drawX = x + (width - textWidth) / 2;

  page.drawText(text, {
    x: drawX,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

async function buildInvitationLetterPdf(invitation) {
  const templateBytes = await loadTemplateBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const guest = parseGuestName(invitation.fullName);
  const domain = String(invitation.domain || process.env.INVITATION_DEFAULT_DOMAIN || '«DOMAINE»').trim();

  const addressLine = guest.displayName || invitation.fullName;
  const salutation = [guest.civility, guest.firstName].filter(Boolean).join(' ').trim() || guest.firstName;
  const signature = guest.signatureName || invitation.fullName;

  // En-tête destinataire : «CIVILITÉ» «PRÉNOM» «NOM»
  coverAndWrite(page, font, {
    x: 60,
    y: 655,
    width: 280,
    height: 12,
    text: addressLine,
    size: 10,
  });

  // Ligne domaine sous «Candidat sélectionné…»
  coverAndWrite(page, font, {
    x: 230,
    y: 640,
    width: 200,
    height: 12,
    text: domain,
    size: 10,
  });

  // Corps : «CIVILITÉ» «PRÉNOM»,
  coverAndWrite(page, font, {
    x: 50,
    y: 519,
    width: 160,
    height: 12,
    text: salutation ? `${salutation},` : `${guest.firstName || invitation.fullName},`,
    size: 10,
  });

  // Corps : «DOMAINE» (fin de paragraphe)
  coverAndWrite(page, font, {
    x: 48,
    y: 444,
    width: 220,
    height: 12,
    text: domain,
    size: 10,
  });

  // Signature : GUIDIBI Christian
  coverAndWrite(page, fontBold, {
    x: 375,
    y: 70,
    width: 160,
    height: 14,
    text: signature,
    size: 11,
    align: 'left',
  });

  // QR code — zone « POUR LE COMITÉ D'ORGANISATION »
  const inviteUrl = getPublicInviteUrl(invitation.code);
  const qrPng = await QRCode.toBuffer(inviteUrl, {
    type: 'png',
    width: 256,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  const qrImage = await pdfDoc.embedPng(qrPng);
  const qrSize = 72;
  page.drawImage(qrImage, {
    x: 68,
    y: 78,
    width: qrSize,
    height: qrSize,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function safePdfFilename(fullName) {
  const base = String(fullName || 'invitation')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return `Invitation_${base || 'invite'}.pdf`;
}

module.exports = {
  buildInvitationLetterPdf,
  parseGuestName,
  getPublicInviteUrl,
  safePdfFilename,
};
