const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const MobilePushToken = require('../models/MobilePushToken');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

let vapidReady = false;

function ensureVapid() {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@rapido.bj';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  vapidReady = true;
  return true;
}

function isPushConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function isExponentToken(token) {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

/**
 * Envoie via l’API Expo Push (Android/iOS standalone ou Expo Go).
 * @param {Array<{ to: string, title: string, body: string, data?: object, android?: object }>} messages
 */
async function sendExpoBatch(messages) {
  if (!messages.length) return null;
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { parseError: true, raw: text, status: res.status };
  }
}

/**
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 */
async function sendExpoPushToUserId(userId, payload) {
  const uid = String(userId);
  const docs = await MobilePushToken.find({ user: uid });
  if (!docs.length) return;

  const title = payload.title || 'Rapido';
  const body = payload.body || '';
  const data = {
    url: payload.url || '/home',
    tag: payload.tag || 'rapido',
  };

  const chunkSize = 100;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const slice = docs.slice(i, i + chunkSize);
    const messages = slice.map((doc) => ({
      to: doc.token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
      android: {
        channelId: 'orders-high',
      },
    }));

    let parsed;
    try {
      parsed = await sendExpoBatch(messages);
    } catch (err) {
      console.error('[push] Expo batch error', err?.message || err);
      continue;
    }

    const tickets = parsed && Array.isArray(parsed.data) ? parsed.data : null;
    if (!tickets || tickets.length !== slice.length) {
      continue;
    }

    for (let j = 0; j < tickets.length; j++) {
      const ticket = tickets[j];
      if (ticket?.status === 'error') {
        const errCode = ticket.details?.error || ticket.message;
        if (
          errCode === 'DeviceNotRegistered' ||
          (typeof ticket.message === 'string' &&
            ticket.message.includes('not a registered push notification recipient'))
        ) {
          await MobilePushToken.deleteOne({ _id: slice[j]._id });
        }
      }
    }
  }
}

/**
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 */
async function sendToUserId(userId, payload) {
  const uid = String(userId);

  if (isPushConfigured() && ensureVapid()) {
    const subs = await PushSubscription.find({ user: uid });
    const body = JSON.stringify({
      title: payload.title || 'Rapido',
      body: payload.body || '',
      url: payload.url || '/home',
      tag: payload.tag || 'rapido',
    });
    for (const doc of subs) {
      const sub = {
        endpoint: doc.endpoint,
        keys: { p256dh: doc.keys.p256dh, auth: doc.keys.auth },
      };
      try {
        await webpush.sendNotification(sub, body, { TTL: 3600 });
      } catch (err) {
        const code = err.statusCode;
        if (code === 404 || code === 410) {
          await PushSubscription.deleteOne({ _id: doc._id });
        }
      }
    }
  }

  await sendExpoPushToUserId(uid, payload);
}

async function sendToUserIds(userIds, payload) {
  const seen = new Set();
  for (const id of userIds) {
    const s = String(id);
    if (seen.has(s)) continue;
    seen.add(s);
    await sendToUserId(s, payload);
  }
}

module.exports = {
  isPushConfigured,
  isExponentToken,
  sendToUserId,
  sendToUserIds,
};
