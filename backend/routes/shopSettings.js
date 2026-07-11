const express = require('express');
const ShopSettings = require('../models/ShopSettings');
const { auth, isRestaurant } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_MESSAGE =
  'Commandez aujourd’hui, livraison un jour après, le {date}. Soyez joignable à l’adresse indiquée.';

async function getOrCreate() {
  let doc = await ShopSettings.findOne({ key: 'default' });
  if (!doc) doc = await ShopSettings.create({ key: 'default' });
  return doc;
}

function serialize(doc) {
  const raw = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...raw,
    deliveryNoticeMessage: String(raw.deliveryNoticeMessage || '').trim(),
    deliveryNoticeMessageDefault: DEFAULT_MESSAGE,
  };
}

router.get('/public', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const doc = await getOrCreate();
    res.json(serialize(doc));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    const doc = await getOrCreate();
    res.json(serialize(doc));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', auth, isRestaurant, async (req, res) => {
  try {
    const doc = await getOrCreate();
    if (req.body.deliveryNoticeMessage != null) {
      doc.deliveryNoticeMessage = String(req.body.deliveryNoticeMessage || '')
        .trim()
        .slice(0, 500);
    }
    await doc.save();
    res.json(serialize(doc));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
