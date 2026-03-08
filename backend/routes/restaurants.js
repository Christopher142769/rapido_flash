const express = require('express');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { auth, isRestaurant } = require('../middleware/auth');
const uploadRestaurant = require('../middleware/uploadRestaurant');
const initDefaultPlats = require('../utils/initDefaultPlats');

const router = express.Router();

// Obtenir tous les restaurants
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    let restaurants = await Restaurant.find({ actif: true })
      .populate('proprietaire', 'nom email')
      .select('-gestionnaires');

    // Si position fournie, calculer la distance et trier
    if (latitude && longitude) {
      restaurants = restaurants.map(resto => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          resto.position.latitude,
          resto.position.longitude
        );
        return { ...resto.toObject(), distance };
      }).sort((a, b) => a.distance - b.distance);
    }

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir un restaurant par ID
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('proprietaire', 'nom email');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Créer un restaurant
router.post('/', auth, isRestaurant, uploadRestaurant.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banniere', maxCount: 1 }
]), (req, res, next) => {
  // Middleware pour gérer les erreurs Multer
  if (req.fileValidationError) {
    return res.status(400).json({ message: req.fileValidationError });
  }
  // Multer parse automatiquement les champs texte dans req.body
  // Mais on s'assure que les valeurs sont bien présentes
  next();
}, async (req, res) => {
  try {
    // Debug: Afficher les données reçues
    console.log('=== CRÉATION RESTAURANT ===');
    console.log('req.body:', req.body);
    console.log('req.body type:', typeof req.body);
    console.log('req.body keys:', Object.keys(req.body || {}));
    console.log('req.files:', req.files);
    console.log('req.user:', req.user ? req.user._id : 'non authentifié');
    console.log('Content-Type:', req.headers['content-type']);

    // Multer parse automatiquement les champs texte dans req.body
    // Mais si req.body est vide, c'est que Multer n'a pas parsé les données
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('ERREUR: req.body est vide! Multer n\'a pas parsé les données.');
      return res.status(400).json({ message: 'Les données du formulaire n\'ont pas été reçues. Vérifiez que vous utilisez multipart/form-data.' });
    }

    // Extraire les valeurs - Multer parse les champs texte dans req.body
    const nom = req.body.nom;
    const description = req.body.description;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const adresse = req.body.adresse;
    const telephone = req.body.telephone;
    const whatsapp = req.body.whatsapp;
    const email = req.body.email;
    const fraisLivraison = req.body.fraisLivraison;
    
    console.log('Valeurs extraites:', {
      nom: nom,
      latitude: latitude,
      longitude: longitude,
      typeLatitude: typeof latitude,
      typeLongitude: typeof longitude,
      nomExists: !!nom,
      latExists: !!latitude,
      lngExists: !!longitude
    });

    // Valider les données requises
    if (!nom || (typeof nom === 'string' && nom.trim() === '')) {
      console.error('ERREUR: Nom manquant ou vide. req.body:', req.body);
      return res.status(400).json({ message: 'Le nom du restaurant est requis' });
    }
    
    if (!latitude || latitude === '' || latitude === undefined || latitude === null || isNaN(parseFloat(latitude))) {
      console.error('ERREUR: Latitude invalide:', latitude, 'Type:', typeof latitude);
      return res.status(400).json({ message: 'La latitude est requise et doit être un nombre valide. Valeur reçue: ' + latitude });
    }
    
    if (!longitude || longitude === '' || longitude === undefined || longitude === null || isNaN(parseFloat(longitude))) {
      console.error('ERREUR: Longitude invalide:', longitude, 'Type:', typeof longitude);
      return res.status(400).json({ message: 'La longitude est requise et doit être un nombre valide. Valeur reçue: ' + longitude });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      console.error('ERREUR: Parsing latitude/longitude échoué. Lat:', latitude, 'Lng:', longitude);
      return res.status(400).json({ message: 'Latitude et longitude doivent être des nombres valides' });
    }

    // Construire l'objet restaurant avec validation
    const restaurantData = {
      nom: String(nom).trim(),
      description: description ? String(description).trim() : '',
      position: { 
        latitude: lat, 
        longitude: lng, 
        adresse: adresse ? String(adresse).trim() : '' 
      },
      telephone: telephone ? String(telephone).trim() : '',
      whatsapp: whatsapp ? String(whatsapp).trim() : '',
      email: email ? String(email).trim() : '',
      fraisLivraison: fraisLivraison ? parseFloat(fraisLivraison) : 0,
      proprietaire: req.user._id
    };

    // Ajouter les fichiers si présents
    if (req.files?.logo) {
      restaurantData.logo = `/uploads/restaurants/logos/${req.files.logo[0].filename}`;
    }

    if (req.files?.banniere) {
      restaurantData.banniere = `/uploads/restaurants/banners/${req.files.banniere[0].filename}`;
    }

    console.log('RestaurantData final AVANT création:', JSON.stringify(restaurantData, null, 2));
    console.log('Position:', restaurantData.position);
    console.log('Position latitude type:', typeof restaurantData.position.latitude);
    console.log('Position longitude type:', typeof restaurantData.position.longitude);

    // Vérifier que les données sont valides avant de créer
    if (!restaurantData.nom || !restaurantData.position.latitude || !restaurantData.position.longitude) {
      console.error('ERREUR: Données manquantes dans restaurantData:', restaurantData);
      return res.status(400).json({ 
        message: 'Données manquantes: nom, latitude ou longitude' 
      });
    }

    const restaurant = new Restaurant(restaurantData);
    
    // Valider avant de sauvegarder
    const validationError = restaurant.validateSync();
    if (validationError) {
      console.error('ERREUR validation Mongoose:', validationError);
      return res.status(400).json({ 
        message: 'Erreur de validation: ' + validationError.message 
      });
    }
    
    await restaurant.save();
    
    // Lier le restaurant au propriétaire
    req.user.restaurantId = restaurant._id;
    await req.user.save();
    
    // Créer les plats par défaut pour ce nouveau restaurant
    try {
      await initDefaultPlats();
      console.log('✅ Plats par défaut créés pour le nouveau restaurant');
    } catch (error) {
      console.error('❌ Erreur lors de la création des plats par défaut:', error);
      // Ne pas bloquer la création du restaurant si les plats ne peuvent pas être créés
    }

    res.status(201).json(restaurant);
  } catch (error) {
    console.error('Erreur création restaurant:', error);
    res.status(500).json({ message: error.message || 'Erreur lors de la création du restaurant' });
  }
});

// Mettre à jour un restaurant
router.put('/:id', auth, uploadRestaurant.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banniere', maxCount: 1 }
]), (req, res, next) => {
  // Middleware pour gérer les erreurs Multer
  if (req.fileValidationError) {
    return res.status(400).json({ message: req.fileValidationError });
  }
  next();
}, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }

    // Vérifier les permissions
    if (restaurant.proprietaire.toString() !== req.user._id.toString() && 
        !restaurant.gestionnaires.includes(req.user._id)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { nom, description, latitude, longitude, adresse, telephone, whatsapp, email, fraisLivraison } = req.body;

    if (nom) restaurant.nom = nom;
    if (description !== undefined) restaurant.description = description;
    if (latitude && longitude) {
      restaurant.position = { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude), 
        adresse: adresse || restaurant.position?.adresse || '' 
      };
    }
    if (telephone !== undefined) restaurant.telephone = telephone;
    if (whatsapp !== undefined) restaurant.whatsapp = whatsapp;
    if (email !== undefined) restaurant.email = email;
    if (fraisLivraison !== undefined) restaurant.fraisLivraison = parseFloat(fraisLivraison) || 0;

    // Gérer les uploads de fichiers
    if (req.files?.logo) {
      restaurant.logo = `/uploads/restaurants/logos/${req.files.logo[0].filename}`;
    }
    if (req.files?.banniere) {
      restaurant.banniere = `/uploads/restaurants/banners/${req.files.banniere[0].filename}`;
    }

    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    console.error('Erreur mise à jour restaurant:', error);
    res.status(500).json({ message: error.message || 'Erreur lors de la mise à jour du restaurant' });
  }
});

// Créer un gestionnaire
router.post('/:id/gestionnaires', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }

    if (restaurant.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { nom, email, password, telephone } = req.body;

    const gestionnaire = new User({
      nom,
      email,
      password,
      telephone,
      role: 'gestionnaire',
      restaurantId: restaurant._id
    });

    await gestionnaire.save();
    restaurant.gestionnaires.push(gestionnaire._id);
    await restaurant.save();

    res.status(201).json({ message: 'Gestionnaire créé', gestionnaire });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les restaurants du propriétaire/gestionnaire
router.get('/my/restaurants', auth, isRestaurant, async (req, res) => {
  try {
    let restaurants;
    
    if (req.user.role === 'restaurant') {
      restaurants = await Restaurant.find({ proprietaire: req.user._id });
    } else if (req.user.role === 'gestionnaire') {
      restaurants = await Restaurant.find({ gestionnaires: req.user._id });
    }

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fonction pour calculer la distance (formule de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;
