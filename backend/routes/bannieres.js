const express = require('express');
const router = express.Router();
const Banniere = require('../models/Banniere');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../utils/cloudinaryClient');

function getCloudinaryPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  // Exemple :
  // https://res.cloudinary.com/<cloud>/image/upload/v1712345678/folder/public_id.jpg
  const m = url.match(/\/upload\/v\d+\/(.+?)\.[a-zA-Z0-9]+$/);
  return m && m[1] ? m[1] : null;
}

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

/** Créer une bannière à partir d’un chemin déjà en médiathèque (/uploads/...) */
router.post('/from-media', auth, async (req, res) => {
  try {
    const { imagePath, restaurantId } = req.body;
    const p = String(imagePath || '').trim();
    const safe = ((p.startsWith('/uploads/') || (p.startsWith('http') && p.includes('cloudinary.com'))) && !p.includes('..'));
    if (!safe) {
      return res.status(400).json({ message: 'Chemin image invalide' });
    }
    const count = await Banniere.countDocuments();
    const banniere = new Banniere({
      image: p,
      restaurant: restaurantId || null,
      ordre: count,
    });
    await banniere.save();
    res.status(201).json(banniere);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload une nouvelle bannière (fichier direct)
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    const imageUrl = req.file.path;
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

    // Si Cloudinary, détruire; sinon ancien comportement (uploads/banners)
    if (String(banniere.image || '').startsWith('http') && String(banniere.image || '').includes('cloudinary.com')) {
      const publicId = getCloudinaryPublicIdFromUrl(banniere.image);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (_) {}
      }
    } else {
      // Supprimer le fichier seulement si stocké dans uploads/banners (pas médiathèque partagée)
      const rel = String(banniere.image || '').replace(/^\//, '');
      if (rel.startsWith('uploads/banners/')) {
        const imagePath = path.join(__dirname, '..', rel);
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (_) {}
        }
      }
    }

    await Banniere.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bannière supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
