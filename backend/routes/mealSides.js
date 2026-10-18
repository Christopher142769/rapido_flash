const express = require('express');
const mongoose = require('mongoose');
const MealSide = require('../models/MealSide');
const { auth, isRestaurant } = require('../middleware/auth');
const { loadMealSides } = require('../utils/mealSides');

const router = express.Router();

function price(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function buildPayload(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  if (!partial || has('name')) out.name = String(body.name || '').trim();
  if (!partial || has('price')) out.price = price(body.price);
  if (!partial || has('extraPrice')) out.extraPrice = price(body.extraPrice, 500);
  if (!partial || has('extraEnabled')) out.extraEnabled = body.extraEnabled !== false && body.extraEnabled !== 'false';
  if (!partial || has('available')) out.available = body.available !== false && body.available !== 'false';
  if (!partial || has('allProducts')) out.allProducts = body.allProducts === true || body.allProducts === 'true';
  if (!partial || has('products')) {
    out.products = (Array.isArray(body.products) ? body.products : [])
      .map((id) => String(id))
      .filter((id) => mongoose.isValidObjectId(id));
  }
  if (has('sortOrder')) out.sortOrder = Number(body.sortOrder) || 0;
  return out;
}

router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    res.json(await loadMealSides());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, isRestaurant, async (req, res) => {
  try {
    const data = buildPayload(req.body || {});
    if (!data.name) return res.status(400).json({ message: 'Le nom est requis' });
    const last = await MealSide.findOne().sort({ sortOrder: -1 }).lean();
    data.sortOrder = (last?.sortOrder || 0) + 10;
    const side = await MealSide.create(data);
    res.status(201).json(side);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const data = buildPayload(req.body || {}, { partial: true });
    if (data.name !== undefined && !data.name) return res.status(400).json({ message: 'Le nom est requis' });
    const side = await MealSide.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
    if (!side) return res.status(404).json({ message: 'Accompagnement introuvable' });
    res.json(side);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const side = await MealSide.findByIdAndDelete(req.params.id);
    if (!side) return res.status(404).json({ message: 'Accompagnement introuvable' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
