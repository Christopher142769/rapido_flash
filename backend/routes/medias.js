const express = require('express');
const fs = require('fs');
const path = require('path');
const Media = require('../models/Media');
const Restaurant = require('../models/Restaurant');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadMedia');

const router = express.Router();

async function canManageRestaurant(userId, restaurantId) {
  if (!restaurantId) return false;
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return false;
  if (restaurant.proprietaire.toString() === userId.toString()) return true;
  return (restaurant.gestionnaires || []).some((g) => g.toString() === userId.toString());
}

/** IDs des entreprises que l’utilisateur peut gérer (pour inclure les anciens médias par restaurant). */
async function manageableRestaurantIds(userId, role) {
  if (role === 'restaurant') {
    return Restaurant.find({ proprietaire: userId }).distinct('_id');
  }
  if (role === 'gestionnaire') {
    return Restaurant.find({ gestionnaires: userId }).distinct('_id');
  }
  return [];
}

async function listFilterForUser(userId, role) {
  const rids = await manageableRestaurantIds(userId, role);
  return {
    $or: [
      { owner: userId },
      { restaurant: { $in: rids } }
    ]
  };
}

/** Galerie du compte : tous les médias dont vous êtes propriétaire + anciens médias de vos entreprises. */
router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    const filter = await listFilterForUser(req.user._id, req.user.role);
    const list = await Media.find(filter).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Upload vers la galerie du compte connecté (sans entreprise). */
router.post('/', auth, isRestaurant, upload.array('files', 30), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: 'Aucun fichier' });
    }

    const created = [];
    for (const f of files) {
      const relPath = `/uploads/medias/${f.filename}`;
      const doc = await Media.create({
        owner: req.user._id,
        path: relPath,
        filename: f.filename,
        originalName: f.originalname || f.filename
      });
      created.push(doc);
    }
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Supprimer un média si vous en êtes propriétaire ou si c’est un ancien média d’une de vos entreprises. */
router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const m = await Media.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Média introuvable' });

    const ownerOk = m.owner && m.owner.toString() === req.user._id.toString();
    const legacyOk = m.restaurant && (await canManageRestaurant(req.user._id, m.restaurant));
    if (!ownerOk && !legacyOk) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const abs = path.join(__dirname, '..', m.path.replace(/^\//, ''));
    if (fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch (_) {}
    }
    await Media.findByIdAndDelete(req.params.id);
    res.json({ message: 'Média supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
