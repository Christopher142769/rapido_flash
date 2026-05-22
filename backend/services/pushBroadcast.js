const mongoose = require('mongoose');
const User = require('../models/User');
const PushSubscription = require('../models/PushSubscription');
const MobilePushToken = require('../models/MobilePushToken');
const {
  isPushConfigured,
  isFcmConfigured,
  getFcmEnvPresence,
  sendToUserIds,
} = require('./pushNotifications');

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 50;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Utilisateurs clients ayant au moins un canal push (mobile ou web). */
async function getClientUserIdsWithPush() {
  const [mobileUserIds, webUserIds] = await Promise.all([
    MobilePushToken.distinct('user'),
    PushSubscription.distinct('user'),
  ]);
  const ids = new Set();
  for (const id of mobileUserIds) ids.add(String(id));
  for (const id of webUserIds) ids.add(String(id));
  if (!ids.size) return [];

  const objectIds = [...ids].map((id) => new mongoose.Types.ObjectId(id));
  const clients = await User.find({
    _id: { $in: objectIds },
    role: 'client',
    banned: { $ne: true },
  })
    .select('_id')
    .lean();

  return clients.map((u) => String(u._id));
}

async function getBroadcastStats() {
  const [totalClients, clientsWithPush, mobileTokenCount, webSubscriptionCount] = await Promise.all([
    User.countDocuments({ role: 'client', banned: { $ne: true } }),
    getClientUserIdsWithPush().then((ids) => ids.length),
    MobilePushToken.countDocuments(),
    PushSubscription.countDocuments(),
  ]);

  const fcmEnv = getFcmEnvPresence();
  return {
    totalClients,
    clientsWithPush,
    mobileTokenCount,
    webSubscriptionCount,
    pushChannels: {
      webVapid: isPushConfigured(),
      fcm: isFcmConfigured(),
      fcmEnvConfigured: !!(fcmEnv.json || fcmEnv.jsonB64 || fcmEnv.path),
    },
  };
}

/**
 * Envoie une notification info à tous les clients avec push enregistré.
 * Traitement asynchrone par lots pour éviter les timeouts HTTP.
 */
async function broadcastToClients(payload, { sentBy } = {}) {
  const title = String(payload.title || '').trim();
  const body = String(payload.body || '').trim();
  const url = payload.url ? String(payload.url).trim() : '/home';
  const tag = payload.tag ? String(payload.tag).trim() : 'rapido-broadcast';

  if (!title) throw new Error('Titre requis');
  if (!body) throw new Error('Message requis');
  if (title.length > 80) throw new Error('Titre trop long (max 80 caractères)');
  if (body.length > 300) throw new Error('Message trop long (max 300 caractères)');
  if (url && !url.startsWith('/')) throw new Error('Lien invalide (doit commencer par /)');

  const userIds = await getClientUserIdsWithPush();
  if (!userIds.length) {
    return { recipientCount: 0, queued: false, message: 'Aucun utilisateur avec notifications activées' };
  }

  const pushPayload = { title, body, url, tag };
  const senderId = sentBy ? String(sentBy) : null;

  setImmediate(async () => {
    console.info(
      '[push] broadcast démarré',
      JSON.stringify({ recipientCount: userIds.length, sentBy: senderId, title })
    );
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      try {
        await sendToUserIds(batch, pushPayload);
      } catch (err) {
        console.error('[push] broadcast batch error', err?.message || err);
      }
      if (i + BATCH_SIZE < userIds.length) await delay(BATCH_DELAY_MS);
    }
    console.info('[push] broadcast terminé', JSON.stringify({ recipientCount: userIds.length }));
  });

  return {
    recipientCount: userIds.length,
    queued: true,
    message: `Envoi en cours vers ${userIds.length} utilisateur(s)`,
  };
}

module.exports = {
  getBroadcastStats,
  broadcastToClients,
  getClientUserIdsWithPush,
};
