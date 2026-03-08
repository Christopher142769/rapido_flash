const express = require('express');
const router = express.Router();
const Banniere = require('../models/Banniere');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Récupérer toutes les bannières actives (public)
router.get('/', async (req, res) => {
  try {
    // Récupérer toutes les bannières actives (actif !== false inclut undefined/null)
    const bannieres = await Banniere.find({ 
      $or: [
        { actif: true },
        { actif: { $exists: false } },
        { actif: null }
      ]
    })
      .populate('restaurant', 'nom logo banniere description _id')
      .sort({ ordre: 1, createdAt: -1 });
    
    console.log('Bannières récupérées:', bannieres.length);
    bannieres.forEach(b => {
      console.log('Bannière:', b._id, 'Restaurant:', b.restaurant?._id || b.restaurant);
    });
    
    res.json(bannieres);
  } catch (error) {
    console.error('Erreur récupération bannières:', error);
    res.status(500).json({ message: error.message });
  }
});

// Récupérer toutes les bannières (admin/restaurant)
router.get('/all', auth, async (req, res) => {
  try {
    const bannieres = await Banniere.find().sort({ ordre: 1, createdAt: -1 });
    res.json(bannieres);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload une nouvelle bannière
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    const imageUrl = `/uploads/banners/${req.file.filename}`;
    const { restaurantId } = req.body;
    
    // Compter les bannières existantes pour définir l'ordre
    const count = await Banniere.countDocuments();
    
    const banniere = new Banniere({
      image: imageUrl,
      restaurant: restaurantId || null,
      ordre: count
    });

    await banniere.save();
    res.status(201).json(banniere);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour une bannière
router.put('/:id', auth, async (req, res) => {
  try {
    const { ordre, actif } = req.body;
    const banniere = await Banniere.findByIdAndUpdate(
      req.params.id,
      { ordre, actif },
      { new: true }
    );
    
    if (!banniere) {
      return res.status(404).json({ message: 'Bannière non trouvée' });
    }
    
    res.json(banniere);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer une bannière
router.delete('/:id', auth, async (req, res) => {
  try {
    const banniere = await Banniere.findById(req.params.id);
    
    if (!banniere) {
      return res.status(404).json({ message: 'Bannière non trouvée' });
    }

    // Supprimer le fichier image
    const imagePath = path.join(__dirname, '..', banniere.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await Banniere.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bannière supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
