const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const admin = require('firebase-admin');
const PushSubscription = require('../models/PushSubscription');
const MobilePushToken = require('../models/MobilePushToken');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

let vapidReady = false;

/** null = pas encore initialisé, sinon instance messaging (les échecs ne sont pas mis en cache : nouvel essai à chaque appel). */
let fcmMessaging = null;
let fcmEnvMissingLogged = false;
let fcmMissingLogged = false;
let lastFcmInitErrorLog = 0;
let lastFcmNoTokenLogByUser = new Map();

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

/** Jeton device FCM (pas Expo). Validation souple pour éviter le stockage de bruit. */
function isLikelyFcmDeviceToken(token) {
  if (typeof token !== 'string' || token.length < 80) return false;
  if (isExponentToken(token)) return false;
  return /^[\w\-:.]+$/.test(token);
}

function normalizeServiceAccountJsonString(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1).trim();
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Pour healthcheck : présence des env (sans init Firebase). */
function getFcmEnvPresence() {
  const j = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const b = process.env.FCM_SERVICE_ACCOUNT_JSON_B64;
  const p = process.env.FCM_SERVICE_ACCOUNT_PATH;
  return {
    json: typeof j === 'string' && j.trim().length > 0,
    jsonB64: typeof b === 'string' && b.trim().length > 0,
    path: typeof p === 'string' && p.trim().length > 0,
  };
}

function getFcmMessaging() {
  if (fcmMessaging) return fcmMessaging;
  try {
    const jsonB64 = normalizeServiceAccountJsonString(process.env.FCM_SERVICE_ACCOUNT_JSON_B64 || '');
    const jsonRaw = normalizeServiceAccountJsonString(process.env.FCM_SERVICE_ACCOUNT_JSON || '');
    const jsonPath = typeof process.env.FCM_SERVICE_ACCOUNT_PATH === 'string'
      ? process.env.FCM_SERVICE_ACCOUNT_PATH.trim()
      : '';
    let credential;
    if (jsonB64) {
      const decoded = Buffer.from(jsonB64, 'base64').toString('utf8');
      credential = admin.credential.cert(JSON.parse(decoded));
    } else if (jsonRaw) {
      credential = admin.credential.cert(JSON.parse(jsonRaw));
    } else if (jsonPath) {
      const abs = path.isAbsolute(jsonPath)
        ? jsonPath
        : path.join(process.cwd(), jsonPath);
      const svc = JSON.parse(fs.readFileSync(abs, 'utf8'));
      credential = admin.credential.cert(svc);
    } else {
      if (!fcmEnvMissingLogged) {
        fcmEnvMissingLogged = true;
        console.warn(
          '[push] FCM : aucune variable FCM_SERVICE_ACCOUNT_JSON, FCM_SERVICE_ACCOUNT_JSON_B64 ni FCM_SERVICE_ACCOUNT_PATH.'
        );
      }
      return null;
    }
    if (!admin.apps.length) {
      admin.initializeApp({ credential });
    }
    fcmMessaging = admin.messaging();
    return fcmMessaging;
  } catch (err) {
    const now = Date.now();
    if (now - lastFcmInitErrorLog > 30000) {
      lastFcmInitErrorLog = now;
      console.error('[push] FCM init error', err?.message || err);
    }
    return null;
  }
}

function isFcmConfigured() {
  return getFcmMessaging() != null;
}

/**
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
  const docs = await MobilePushToken.find({
    user: uid,
    $or: [{ provider: 'expo' }, { provider: { $exists: false } }],
  });
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
async function sendFcmPushToUserId(userId, payload) {
  const messaging = getFcmMessaging();
  if (!messaging) {
    if (!fcmMissingLogged) {
      fcmMissingLogged = true;
      console.warn(
        '[push] FCM indisponible : vérifiez FCM_SERVICE_ACCOUNT_JSON ou un fichier valide pour FCM_SERVICE_ACCOUNT_PATH (cwd=' +
          process.cwd() +
          '). Les pushes natifs Android/iOS ne partiront pas.'
      );
    }
    return;
  }

  const uid = String(userId);
  const docs = await MobilePushToken.find({ user: uid, provider: 'fcm' });
  if (!docs.length) {
    const now = Date.now();
    const prev = lastFcmNoTokenLogByUser.get(uid) || 0;
    if (now - prev > 60000) {
      lastFcmNoTokenLogByUser.set(uid, now);
      console.warn('[push] FCM: aucun token device pour user', uid);
    }
    return;
  }

  const title = payload.title || 'Rapido';
  const body = payload.body || '';
  const url = payload.url || '/home';
  const tag = payload.tag || 'rapido';

  const chunkSize = 500;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const slice = docs.slice(i, i + chunkSize);
    const tokens = slice.map((d) => d.token);
    try {
      const resp = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { url, tag },
        android: {
          priority: 'high',
          notification: {
            channelId: 'rapido_alerts',
            sound: 'default',
          },
        },
      });
      for (let j = 0; j < resp.responses.length; j++) {
        const r = resp.responses[j];
        if (r.success) continue;
        const code = r.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          await MobilePushToken.deleteOne({ _id: slice[j]._id });
        }
      }
    } catch (err) {
      console.error('[push] FCM multicast error', err?.message || err);
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
      sound: payload.sound || 'default',
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
  await sendFcmPushToUserId(uid, payload);
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
  isFcmConfigured,
  getFcmEnvPresence,
  isExponentToken,
  isLikelyFcmDeviceToken,
  sendToUserId,
  sendToUserIds,
};
