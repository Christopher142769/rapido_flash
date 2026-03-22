const express = require('express');
const Produit = require('../models/Produit');
const Restaurant = require('../models/Restaurant');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadProduit');
const uploadProductFields = upload.uploadProductFields;

const router = express.Router();

// Liste pour un restaurant (public)
router.get('/', async (req, res) => {
  try {
    const { restaurantId, categorieProduitId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId requis' });
    }
    const query = { restaurant: restaurantId, disponible: true };
    if (categorieProduitId) query.categorieProduit = categorieProduitId;
    const list = await Produit.find(query)
      .populate('categorieProduit', 'nom image')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Détail
router.get('/:id', async (req, res) => {
  try {
    const p = await Produit.findById(req.params.id).populate('categorieProduit', 'nom image').populate('restaurant', 'nom logo');
    if (!p) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(p);
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
router.post('/', auth, isRestaurant, upload.fields(uploadProductFields), async (req, res) => {
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

    const { nom, description, prix, categorieProduitId } = req.body;
    if (!nom || !nom.trim()) return res.status(400).json({ message: 'Le nom est requis' });
    if (prix === undefined || prix === null || isNaN(parseFloat(prix))) {
      return res.status(400).json({ message: 'Le prix (FCFA) est requis' });
    }

    const files = req.files || {};
    const mainFile = files.image && files.image[0];
    const carteFile = files.imageCarteHome && files.imageCarteHome[0];
    const banniereFile = files.banniereProduit && files.banniereProduit[0];

    const data = {
      nom: nom.trim(),
      description: (description && description.trim()) || '',
      prix: parseFloat(prix),
      restaurant: restaurantId,
      disponible: true
    };
    if (categorieProduitId) data.categorieProduit = categorieProduitId;
    if (mainFile) {
      data.images = [`/uploads/produits/${mainFile.filename}`];
    }
    if (carteFile) {
      data.imageCarteHome = `/uploads/produits/${carteFile.filename}`;
    }
    if (banniereFile) {
      data.banniereProduit = `/uploads/produits/${banniereFile.filename}`;
    }
    const prod = new Produit(data);
    await prod.save();
    await prod.populate('categorieProduit', 'nom image');
    res.status(201).json(prod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour
router.put('/:id', auth, isRestaurant, upload.fields(uploadProductFields), async (req, res) => {
  try {
    const prod = await Produit.findById(req.params.id);
    if (!prod) return res.status(404).json({ message: 'Produit non trouvé' });

    const restaurant = await Restaurant.findById(prod.restaurant);
    if (!restaurant || (restaurant.proprietaire.toString() !== req.user._id.toString() &&
        !(restaurant.gestionnaires || []).some(g => g.toString() === req.user._id.toString()))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const files = req.files || {};
    const mainFile = files.image && files.image[0];
    const carteFile = files.imageCarteHome && files.imageCarteHome[0];
    const banniereFile = files.banniereProduit && files.banniereProduit[0];

    if (req.body.nom) prod.nom = req.body.nom.trim();
    if (req.body.description !== undefined) prod.description = req.body.description.trim();
    if (req.body.prix !== undefined) prod.prix = parseFloat(req.body.prix);
    if (req.body.categorieProduitId !== undefined) prod.categorieProduit = req.body.categorieProduitId || null;
    if (req.body.disponible !== undefined) prod.disponible = !!req.body.disponible;
    if (mainFile) {
      const newImg = `/uploads/produits/${mainFile.filename}`;
      prod.images = Array.isArray(prod.images) && prod.images.length
        ? [...prod.images, newImg]
        : [newImg];
    }
    if (carteFile) {
      prod.imageCarteHome = `/uploads/produits/${carteFile.filename}`;
    }
    if (banniereFile) {
      prod.banniereProduit = `/uploads/produits/${banniereFile.filename}`;
    }
    await prod.save();
    await prod.populate('categorieProduit', 'nom image');
    res.json(prod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer
router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const prod = await Produit.findById(req.params.id);
    if (!prod) return res.status(404).json({ message: 'Produit non trouvé' });
    const restaurant = await Restaurant.findById(prod.restaurant);
    if (!restaurant || (restaurant.proprietaire.toString() !== req.user._id.toString() &&
        !(restaurant.gestionnaires || []).some(g => g.toString() === req.user._id.toString()))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    await Produit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
