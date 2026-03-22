const express = require('express');
const CategorieProduit = require('../models/CategorieProduit');
const Restaurant = require('../models/Restaurant');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadCategorieProduit');

const router = express.Router();

// Liste pour un restaurant (public pour la page structure)
router.get('/', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId requis' });
    }
    const list = await CategorieProduit.find({ restaurant: restaurantId })
      .select('nom nomEn image restaurant ordre')
      .sort({ ordre: 1, nom: 1 })
      .lean();
    res.json(
      list.map((c) => ({
        ...c,
        nomEn: c.nomEn != null && String(c.nomEn).trim() !== '' ? String(c.nomEn).trim() : '',
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vérifier que l'utilisateur peut gérer ce restaurant
async function canManageRestaurant(userId, restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return false;
  if (restaurant.proprietaire.toString() === userId.toString()) return true;
  return (restaurant.gestionnaires || []).some(g => g.toString() === userId.toString());
}

// Créer (dashboard) — restaurantId dans le body pour choisir l'entreprise
router.post('/', auth, isRestaurant, upload.single('image'), async (req, res) => {
  try {
    let restaurantId = req.body.restaurantId;
    if (!restaurantId) {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);
      restaurantId = user.restaurantId?._id || user.restaurantId;
    }
    if (!restaurantId) {
      return res.status(400).json({ message: 'Aucune structure associée. Sélectionnez une entreprise ou créez-en une.' });
    }
    const allowed = await canManageRestaurant(req.user._id, restaurantId);
    if (!allowed) {
      return res.status(403).json({ message: 'Accès refusé pour cette entreprise' });
    }

    const { nom, nomEn, ordre } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom est requis' });
    }

    const data = {
      nom: nom.trim(),
      nomEn: nomEn != null ? String(nomEn).trim() : '',
      restaurant: restaurantId,
      ordre: ordre ? parseInt(ordre, 10) : 0
    };
    if (req.file) {
      data.image = `/uploads/categories-produit/${req.file.filename}`;
    } else if (req.body.imagePath && String(req.body.imagePath).startsWith('/uploads/') && !String(req.body.imagePath).includes('..')) {
      data.image = String(req.body.imagePath).trim();
    }
    const cat = new CategorieProduit(data);
    await cat.save();
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Modifier
router.put('/:id', auth, isRestaurant, upload.single('image'), async (req, res) => {
  try {
    const cat = await CategorieProduit.findById(req.params.id).populate('restaurant');
    if (!cat) return res.status(404).json({ message: 'Catégorie non trouvée' });

    const restaurant = cat.restaurant;
    if (restaurant.proprietaire.toString() !== req.user._id.toString() &&
        !(restaurant.gestionnaires || []).some(g => g.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    if (req.body.nom) cat.nom = req.body.nom.trim();
    if (req.body.nomEn !== undefined) cat.nomEn = String(req.body.nomEn || '').trim();
    if (req.body.ordre !== undefined) cat.ordre = parseInt(req.body.ordre, 10);
    if (req.file) cat.image = `/uploads/categories-produit/${req.file.filename}`;
    if (req.body.imagePath !== undefined) {
      const v = String(req.body.imagePath || '').trim();
      if (v === '') cat.image = null;
      else if (v.startsWith('/uploads/') && !v.includes('..')) cat.image = v;
    }
    await cat.save();
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer
router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const cat = await CategorieProduit.findById(req.params.id).populate('restaurant');
    if (!cat) return res.status(404).json({ message: 'Catégorie non trouvée' });
    const restaurant = cat.restaurant;
    if (restaurant.proprietaire.toString() !== req.user._id.toString() &&
        !(restaurant.gestionnaires || []).some(g => g.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    await CategorieProduit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
