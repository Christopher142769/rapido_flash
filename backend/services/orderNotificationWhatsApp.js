const { getRapidoWhatsAppNotifyDigits } = require('../utils/rapidoWhatsApp');
const { isWhatsAppCloudConfigured, sendWhatsAppText } = require('./whatsappCloudApi');

function isWhatsAppConfigured() {
  const callmebot = process.env.CALLMEBOT_WHATSAPP_APIKEY;
  return Boolean(isWhatsAppCloudConfigured() || callmebot);
}

async function sendViaCallMeBot(toDigits, body) {
  const apikey = process.env.CALLMEBOT_WHATSAPP_APIKEY;
  if (!apikey) {
    return { sent: false, reason: 'callmebot_not_configured' };
  }

  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone', toDigits);
  url.searchParams.set('text', body.slice(0, 1400));
  url.searchParams.set('apikey', apikey);

  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok) {
    return { sent: false, reason: 'callmebot_error', error: text || res.statusText };
  }
  if (/error/i.test(text)) {
    return { sent: false, reason: 'callmebot_error', error: text };
  }
  return { sent: true, provider: 'callmebot' };
}

/**
 * Envoie une alerte texte WhatsApp à l'équipe Rapido (+229 40393994 par défaut).
 * Priorité : API Cloud Meta (WHATSAPP_CLOUD_*) puis CallMeBot (CALLMEBOT_WHATSAPP_APIKEY).
 */
async function notifyOrderWhatsApp(body) {
  const toDigits = getRapidoWhatsAppNotifyDigits();
  if (!toDigits) {
    return { sent: false, reason: 'no_recipient' };
  }

  const text = String(body || '').trim();
  if (!text) {
    return { sent: false, reason: 'empty_body' };
  }

  const cloudConfigured = isWhatsAppCloudConfigured();
  const callmebotConfigured = process.env.CALLMEBOT_WHATSAPP_APIKEY;

  if (cloudConfigured) {
    const result = await sendWhatsAppText(toDigits, text);
    if (result.sent) return result;
    if (!callmebotConfigured) {
      console.error('[WhatsApp commande] Cloud:', result.error || result.reason);
      return result;
    }
    console.warn('[WhatsApp commande] Cloud échoué, essai CallMeBot:', result.error || result.reason);
  }

  if (callmebotConfigured) {
    const result = await sendViaCallMeBot(toDigits, text);
    if (!result.sent) {
      console.error('[WhatsApp commande] CallMeBot:', result.error || result.reason);
    }
    return result;
  }

  console.log('📱 [DEV] Notification WhatsApp commande →', toDigits);
  console.log(text);
  return { sent: false, reason: 'not_configured' };
}

module.exports = { notifyOrderWhatsApp, isWhatsAppConfigured };
