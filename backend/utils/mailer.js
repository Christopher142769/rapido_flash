/**
 * Envoi d'email pour le code de connexion.
 * Si SMTP n'est pas configuré (.env), le code est affiché dans la console (développement).
 */

const sendLoginCode = async (email, code) => {
  const subject = 'Votre code de connexion Rapido Flash';
  const html = `
    <p>Bonjour,</p>
    <p>Votre code de connexion est : <strong>${code}</strong></p>
    <p>Ce code est valide 15 minutes. Ne le partagez avec personne.</p>
    <p>— L'équipe Rapido Flash</p>
  `;
  const text = `Votre code de connexion Rapido Flash : ${code}. Valide 15 minutes.`;

  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER;

  if (hasSmtp) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      const from = process.env.MAIL_FROM || process.env.SMTP_USER;
      await transporter.sendMail({ from, to: email, subject, text, html });
      return { sent: true };
    } catch (err) {
      console.error('Erreur envoi email:', err.message);
      return { sent: false, error: err.message };
    }
  }

  // Développement : afficher le code dans la console
  console.log('📧 [DEV] Code de connexion pour', email, ':', code);
  return { sent: true };
};

const sendDashboardLoginCode = async (email, code) => {
  const subject = 'Code de validation dashboard Rapido Flash';
  const html = `
    <p>Bonjour,</p>
    <p>Votre code de validation dashboard est : <strong style="font-size:20px;letter-spacing:2px;">${code}</strong></p>
    <p>Ce code est valide 10 minutes. Si vous n'êtes pas à l'origine de cette connexion, ignorez cet email.</p>
    <p>— Sécurité Rapido Flash</p>
  `;
  const text = `Code de validation dashboard Rapido Flash : ${code}. Valide 10 minutes.`;

  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER;

  if (hasSmtp) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      const from = process.env.MAIL_FROM || process.env.SMTP_USER;
      await transporter.sendMail({ from, to: email, subject, text, html });
      return { sent: true };
    } catch (err) {
      console.error('Erreur envoi email 2FA:', err.message);
      return { sent: false, error: err.message };
    }
  }

  console.log('📧 [DEV] Code 2FA dashboard pour', email, ':', code);
  return { sent: true };
};

module.exports = { sendLoginCode, sendDashboardLoginCode };
