const express = require('express');
const PushSubscription = require('../models/PushSubscription');
const MobilePushToken = require('../models/MobilePushToken');
const { auth } = require('../middleware/auth');
const {
  isPushConfigured,
  isExponentToken,
  isLikelyFcmDeviceToken,
} = require('../services/pushNotifications');

const router = express.Router();

/** Clé publique VAPID pour PushManager.subscribe (sans auth) */
router.get('/vapid-public-key', (req, res) => {
  const pub = process.env.VAPID_PUBLIC_KEY;
  if (!pub) {
    return res.status(503).json({ message: 'Push non configuré sur le serveur' });
  }
  res.json({ publicKey: pub });
});

/** Enregistrer l’abonnement push du navigateur */
router.post('/subscribe', auth, async (req, res) => {
  try {
    if (!isPushConfigured()) {
      return res.status(503).json({ message: 'Push non configuré' });
    }
    const sub = req.body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return res.status(400).json({ message: 'Subscription invalide' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      {
        user: req.user._id,
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Enregistrer le jeton Expo Push (app mobile React Native). */
router.post('/mobile/register', auth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token || !isExponentToken(token)) {
      return res.status(400).json({ message: 'Token Expo invalide' });
    }
    const plat = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'unknown';
    await MobilePushToken.findOneAndUpdate(
      { token },
      { user: req.user._id, token, platform: plat, provider: 'expo' },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/mobile/unregister', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await MobilePushToken.deleteOne({ token, user: req.user._id });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/** Jeton FCM (app Capacitor Android / iOS avec Firebase). */
router.post('/fcm/register', auth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token || !isLikelyFcmDeviceToken(token)) {
      return res.status(400).json({ message: 'Jeton FCM invalide' });
    }
    const plat = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'unknown';
    await MobilePushToken.findOneAndUpdate(
      { token },
      { user: req.user._id, token, platform: plat, provider: 'fcm' },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/fcm/unregister', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await MobilePushToken.deleteOne({ token, user: req.user._id });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
