const express = require('express');
const Plat = require('../models/Plat');
const Restaurant = require('../models/Restaurant');
const { auth, isRestaurant } = require('../middleware/auth');
const uploadPlat = require('../middleware/uploadPlat');

const router = express.Router();

// Middleware pour parser JSON et URL-encoded pour les routes qui n'utilisent pas Multer
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Obtenir toutes les catégories
router.get('/categories', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    let query = {};
    if (restaurantId) {
      const mongoose = require('mongoose');
      let restaurantObjectId;
      try {
        restaurantObjectId = mongoose.Types.ObjectId.isValid(restaurantId) 
          ? new mongoose.Types.ObjectId(restaurantId) 
          : restaurantId;
      } catch (e) {
        restaurantObjectId = restaurantId;
      }
      
      query = {
        'restaurants.restaurant': restaurantObjectId,
        'restaurants.disponible': true
      };
    }
    
    const plats = await Plat.find(query);
    const categories = [...new Set(plats.map(plat => plat.categorie).filter(Boolean))];
    res.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir tous les plats
router.get('/', async (req, res) => {
  try {
    const { restaurantId, categorie } = req.query;
    
    let query = {};
    if (restaurantId) {
      // Convertir restaurantId en ObjectId si nécessaire
      const mongoose = require('mongoose');
      let restaurantObjectId;
      try {
        restaurantObjectId = mongoose.Types.ObjectId.isValid(restaurantId) 
          ? new mongoose.Types.ObjectId(restaurantId) 
          : restaurantId;
      } catch (e) {
        restaurantObjectId = restaurantId;
      }
      
      // Filtrer les plats qui sont associés à ce restaurant et disponibles
      query = {
        'restaurants.restaurant': restaurantObjectId,
        'restaurants.disponible': true
      };
    }
    
    // Filtrer par catégorie si fournie
    if (categorie) {
      query.categorie = categorie;
    }
    
    const plats = await Plat.find(query)
      .populate({
        path: 'restaurants.restaurant',
        select: 'nom logo telephone whatsapp email description fraisLivraison'
      });
    res.json(plats);
  } catch (error) {
    console.error('Erreur lors de la récupération des plats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir un plat par ID
router.get('/:id', async (req, res) => {
  try {
    const plat = await Plat.findById(req.params.id);
    if (!plat) {
      return res.status(404).json({ message: 'Plat non trouvé' });
    }
    res.json(plat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Créer un plat (restaurant uniquement)
router.post('/', auth, isRestaurant, uploadPlat.single('image'), async (req, res) => {
  try {
    const { nom, description, prix, categorie } = req.body;

    // Récupérer le restaurant de l'utilisateur
    const User = require('../models/User');
    const user = await User.findById(req.user._id).populate('restaurantId');
    const restaurantId = user.restaurantId?._id || user.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ message: 'Vous devez avoir un restaurant pour créer un plat' });
    }

    const platData = {
      nom,
      description,
      prix,
      categorie,
      // Associer automatiquement le plat au restaurant
      restaurants: [{
        restaurant: restaurantId,
        disponible: true
      }]
    };

    if (req.file) {
      platData.image = req.file.path;
    } else if (req.body.image) {
      platData.image = req.body.image;
    }

    const plat = new Plat(platData);
    await plat.save();
    res.status(201).json(plat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour un plat
router.put('/:id', auth, isRestaurant, uploadPlat.single('image'), async (req, res) => {
  try {
    const plat = await Plat.findById(req.params.id);
    if (!plat) {
      return res.status(404).json({ message: 'Plat non trouvé' });
    }

    const { nom, description, prix, categorie, disponible } = req.body;

    if (nom) plat.nom = nom;
    if (description) plat.description = description;
    if (prix) plat.prix = prix;
    if (categorie) plat.categorie = categorie;
    if (disponible !== undefined) plat.disponible = disponible;

    // Gérer l'upload d'image
    if (req.file) {
      plat.image = req.file.path;
    } else if (req.body.image) {
      plat.image = req.body.image;
    }

    await plat.save();
    res.json(plat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ajouter un plat à un restaurant
router.post('/:id/restaurants/:restaurantId', auth, isRestaurant, async (req, res) => {
  try {
    const plat = await Plat.findById(req.params.id);
    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!plat || !restaurant) {
      return res.status(404).json({ message: 'Plat ou restaurant non trouvé' });
    }

    // Vérifier les permissions
    if (restaurant.proprietaire.toString() !== req.user._id.toString() && 
        !restaurant.gestionnaires.includes(req.user._id)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { disponible = true } = req.body;

    const existingIndex = plat.restaurants.findIndex(r => 
      r.restaurant.toString() === req.params.restaurantId
    );

    if (existingIndex >= 0) {
      plat.restaurants[existingIndex].disponible = disponible;
    } else {
      plat.restaurants.push({
        restaurant: req.params.restaurantId,
        disponible
      });
    }

    await plat.save();
    res.json(plat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer un plat
router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    await Plat.findByIdAndDelete(req.params.id);
    res.json({ message: 'Plat supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
