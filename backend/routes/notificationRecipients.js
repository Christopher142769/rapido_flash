const express = require('express');
const NotificationRecipient = require('../models/NotificationRecipient');
const { auth, isStaffPresence } = require('../middleware/auth');
const { defaultRecipients, recipientsFor } = require('../utils/notificationRecipients');
const { sendCustomFormNotification } = require('../utils/mailer');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

router.get('/', auth, isStaffPresence, async (_req, res) => {
  try {
    const out = {
      smtp: {
        configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        host: process.env.SMTP_HOST || '',
        from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
      },
    };
    for (const channel of NotificationRecipient.CHANNELS) {
      const extra = await NotificationRecipient.find({ channel }).sort({ createdAt: 1 }).lean();
      out[channel] = {
        defaults: defaultRecipients(channel),
        added: extra.map((r) => ({ id: r._id, email: r.email })),
      };
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Envoie un e-mail de test à la liste d'un canal et renvoie le résultat réel (diagnostic SMTP). */
router.post('/test', auth, isStaffPresence, async (req, res) => {
  try {
    const channel = String(req.body?.channel || '');
    if (!NotificationRecipient.CHANNELS.includes(channel)) return res.status(400).json({ message: 'Canal invalide' });
    const to = await recipientsFor(channel);
    const result = await sendCustomFormNotification({
      to,
      subject: `[Rapido] Test d’e-mail — ${channel}`,
      text: `Ceci est un e-mail de test (canal « ${channel} »). Si vous le recevez, les notifications fonctionnent.`,
      html: `<p>Ceci est un e-mail de test (canal « ${channel} »).</p><p>Si vous le recevez, les notifications fonctionnent.</p>`,
    });
    res.json({ to, sent: !!result.sent, dev: !!(result.sent && !(process.env.SMTP_HOST && process.env.SMTP_USER)), error: result.error || '' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/', auth, isStaffPresence, async (req, res) => {
  try {
    const channel = String(req.body?.channel || '');
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!NotificationRecipient.CHANNELS.includes(channel)) return res.status(400).json({ message: 'Canal invalide' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Adresse e-mail invalide' });
    if (defaultRecipients(channel).includes(email)) return res.status(409).json({ message: 'Adresse déjà présente par défaut' });
    try {
      await NotificationRecipient.create({ channel, email, addedBy: req.user.email || '' });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ message: 'Adresse déjà ajoutée' });
      throw err;
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', auth, isStaffPresence, async (req, res) => {
  try {
    await NotificationRecipient.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
