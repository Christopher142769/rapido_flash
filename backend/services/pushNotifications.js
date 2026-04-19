const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

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

/**
 * @param {string} userId
 * @param {{ title: string, body: string, url?: string, tag?: string }} payload
 */
async function sendToUserId(userId, payload) {
  if (!isPushConfigured() || !ensureVapid()) return;
  const uid = String(userId);
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
  sendToUserId,
  sendToUserIds,
};
