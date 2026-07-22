const express = require('express');
const User = require('../models/User');
const { auth, isRestaurantAdmin } = require('../middleware/auth');
const { RESPONSABLE_CITIES } = require('../utils/responsableAccess');

const router = express.Router();

router.get('/accounts', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'responsable' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/accounts', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const nom = String(req.body?.nom || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const telephone = String(req.body?.telephone || '').trim();
    const password = String(req.body?.password || '');
    const assignedCity = String(req.body?.assignedCity || '').trim();

    if (!nom || !email || password.length < 6) {
      return res.status(400).json({ message: 'Nom, email et mot de passe (6 car. min) requis' });
    }
    if (!RESPONSABLE_CITIES.includes(assignedCity)) {
      return res.status(400).json({ message: 'Choisissez la ville : Cotonou ou Calavi' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Cet email est déjà utilisé' });

    const user = new User({
      nom,
      email,
      telephone,
      password,
      role: 'responsable',
      assignedCity,
    });
    await user.save();
    const out = user.toObject();
    delete out.password;
    res.status(201).json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch('/accounts/:id', auth, isRestaurantAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'responsable' });
    if (!user) return res.status(404).json({ message: 'Responsable introuvable' });

    if (req.body.nom) user.nom = String(req.body.nom).trim();
    if (req.body.telephone !== undefined) user.telephone = String(req.body.telephone || '').trim();
    if (req.body.banned !== undefined) user.banned = !!req.body.banned;
    if (req.body.assignedCity != null) {
      const city = String(req.body.assignedCity || '').trim();
      if (!RESPONSABLE_CITIES.includes(city)) {
        return res.status(400).json({ message: 'Choisissez la ville : Cotonou ou Calavi' });
      }
      user.assignedCity = city;
    }
    if (req.body.password && String(req.body.password).length >= 6) {
      user.password = String(req.body.password);
    }
    await user.save();
    const out = user.toObject();
    delete out.password;
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
