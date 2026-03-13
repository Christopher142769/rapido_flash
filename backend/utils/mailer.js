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

module.exports = { sendLoginCode };
