const express = require('express');
const { handleIncomingShopWhatsAppMessage } = require('../services/shopOrderWhatsAppConfirmation');

const router = express.Router();

function verifyToken() {
  return String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'rapido_flash_wa').trim();
}

/** Vérification Meta (GET) — à configurer dans l’app WhatsApp Business. */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken()) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/** Messages entrants — réponse auto confirmation Shop après envoi client. */
router.post('/', async (req, res) => {
  res.sendStatus(200);

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages?.length) continue;

        for (const message of value.messages) {
          if (message.type !== 'text' || !message.text?.body) continue;
          const from = String(message.from || '').replace(/\D/g, '');
          if (!from) continue;

          void handleIncomingShopWhatsAppMessage(from, message.text.body).catch((err) => {
            console.error('[WhatsApp webhook Shop]', err.message);
          });
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp webhook]', err.message);
  }
});

module.exports = router;
