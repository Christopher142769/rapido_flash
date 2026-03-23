const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Produit = require('../models/Produit');
const User = require('../models/User');
const { auth, isRestaurant } = require('../middleware/auth');
const uploadRestaurant = require('../middleware/uploadRestaurant');

const router = express.Router();

function isAllowedStoredPath(p) {
  const s = String(p || '').trim();
  if (!s) return false;
  if (!s.startsWith('/uploads/') && !(s.startsWith('http') && s.includes('cloudinary.com'))) return false;
  if (s.includes('..')) return false;
  return true;
}

/** categorieIds = JSON string ou tableau ; sinon undefined (ne pas modifier en PUT) */
function parseCategorieIdsFromBody(body) {
  if (!Object.prototype.hasOwnProperty.call(body, 'categorieIds')) return undefined;
  try {
    const raw = typeof body.categorieIds === 'string' ? JSON.parse(body.categorieIds || '[]') : body.categorieIds;
    if (!Array.isArray(raw)) return [];
    return raw.map(String).filter((id) => mongoose.Types.ObjectId.isValid(id));
  } catch (_) {
    return [];
  }
}

function setRestaurantCategories(restaurantLike, ids) {
  const valid = (ids || []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  restaurantLike.categoriesDomaine = valid.map((id) => new mongoose.Types.ObjectId(id));
  restaurantLike.categorie = valid.length > 0 ? restaurantLike.categoriesDomaine[0] : null;
}

const populateCategories = [
  { path: 'categorie', select: 'nom icone nomEn' },
  { path: 'categoriesDomaine', select: 'nom icone nomEn' }
];

// Obtenir tous les restaurants (structures)
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude, categorieId } = req.query;
    const query = { actif: true };
    if (categorieId && mongoose.Types.ObjectId.isValid(categorieId)) {
      query.$or = [
        { categoriesDomaine: categorieId },
        { categorie: categorieId }
      ];
    }

    let restaurants = await Restaurant.find(query)
      .populate('proprietaire', 'nom email')
      .populate(populateCategories)
      .select('-gestionnaires');

    let list = restaurants.map((r) => r.toObject());

    // Si position fournie, calculer la distance et trier
    if (latitude && longitude) {
      list = list.map((resto) => {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          resto.position.latitude,
          resto.position.longitude
        );
        return { ...resto, distance };
      }).sort((a, b) => a.distance - b.distance);
    }

    // Aperçu produits pour les cartes home (tous les produits disponibles)
    const ids = list.map((r) => r._id);
    const produits = await Produit.find({ restaurant: { $in: ids }, disponible: true })
      .sort({ createdAt: -1 })
      .select(
        'nom nomEn nomAfficheAccueil nomAfficheAccueilEn prix images imageCarteHome restaurant'
      )
      .lean();

    const byRest = {};
    for (const p of produits) {
      const rid = p.restaurant.toString();
      if (!byRest[rid]) byRest[rid] = [];
      const thumb =
        (p.imageCarteHome && String(p.imageCarteHome).trim()) ||
        (p.images && p.images[0]) ||
        null;
      const label = (p.nomAfficheAccueil && String(p.nomAfficheAccueil).trim()) || p.nom;
      byRest[rid].push({
        productId: p._id,
        restaurantId: p.restaurant,
        nom: label,
        nomEn: p.nomEn,
        nomAfficheAccueil: p.nomAfficheAccueil,
        nomAfficheAccueilEn: p.nomAfficheAccueilEn,
        prix: p.prix,
        image: thumb
      });
    }

    const enriched = list.map((r) => ({
      ...r,
      produitsApercu: byRest[r._id.toString()] || []
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les restaurants du propriétaire/gestionnaire (AVANT /:id pour éviter que "my" soit capturé par :id)
router.get('/my/restaurants', auth, isRestaurant, async (req, res) => {
  try {
    let restaurants;
    if (req.user.role === 'restaurant') {
      restaurants = await Restaurant.find({ proprietaire: req.user._id }).populate(populateCategories);
    } else if (req.user.role === 'gestionnaire') {
      restaurants = await Restaurant.find({ gestionnaires: req.user._id }).populate(populateCategories);
    } else {
      restaurants = [];
    }
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lister les gestionnaires d'un restaurant (AVANT /:id pour matcher /:id/gestionnaires)
router.get('/:id/gestionnaires', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant non trouvé' });
    if (restaurant.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const users = await User.find({ _id: { $in: restaurant.gestionnaires } }).select('nom email telephone createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Créer un gestionnaire (AVANT /:id)
router.post('/:id/gestionnaires', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant non trouvé' });
    if (restaurant.proprietaire.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const body = req.body || {};
    const nom = body.nom;
    const email = body.email;
    const password = body.password;
    const telephone = body.telephone;
    if (!nom || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe sont requis' });
    }
    const gestionnaire = new User({
      nom,
      email,
      password,
      telephone: telephone || '',
      role: 'gestionnaire',
      restaurantId: restaurant._id
    });
    await gestionnaire.save();
    restaurant.gestionnaires.push(gestionnaire._id);
    await restaurant.save();
    const gestionnaireObj = gestionnaire.toObject();
    delete gestionnaireObj.password;
    res.status(201).json({
      message: 'Gestionnaire créé',
      gestionnaire: gestionnaireObj,
      credentials: { email, password }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Erreur serveur' });
  }
});

// Obtenir un restaurant (structure) par ID
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .populate('proprietaire', 'nom email')
      .populate(populateCategories);
    if (!restaurant) {
      return res.status(404).json({ message: 'Structure non trouvée' });
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
    const parseJoursVente = (body) => {
      try {
        if (body.joursVente == null || body.joursVente === '') return [];
        if (Array.isArray(body.joursVente)) {
          return body.joursVente.map(Number).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
        }
        const parsed = JSON.parse(body.joursVente);
        if (Array.isArray(parsed)) {
          return parsed.map(Number).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
        }
      } catch (_) { /* ignore */ }
      return [];
    };

    let categorieIdsResolved = parseCategorieIdsFromBody(req.body);
    if (categorieIdsResolved === undefined) {
      categorieIdsResolved = req.body.categorieId && mongoose.Types.ObjectId.isValid(req.body.categorieId)
        ? [String(req.body.categorieId)]
        : [];
    }

    const restaurantData = {
      nom: String(nom).trim(),
      nomEn: req.body.nomEn != null && String(req.body.nomEn).trim() !== '' ? String(req.body.nomEn).trim() : '',
      description: description ? String(description).trim() : '',
      descriptionEn: req.body.descriptionEn != null && String(req.body.descriptionEn).trim() !== '' ? String(req.body.descriptionEn).trim() : '',
      position: { 
        latitude: lat, 
        longitude: lng, 
        adresse: adresse ? String(adresse).trim() : '' 
      },
      telephone: telephone ? String(telephone).trim() : '',
      whatsapp: whatsapp ? String(whatsapp).trim() : '',
      email: email ? String(email).trim() : '',
      fraisLivraison: fraisLivraison ? parseFloat(fraisLivraison) : 0,
      proprietaire: req.user._id,
      joursVente: parseJoursVente(req.body),
      commanderVeille: req.body.commanderVeille === 'true' || req.body.commanderVeille === true
    };
    setRestaurantCategories(restaurantData, categorieIdsResolved);

    // Ajouter les fichiers si présents
    if (req.files?.logo) {
      restaurantData.logo = req.files.logo[0].path;
    }

    if (req.files?.banniere) {
      restaurantData.banniere = req.files.banniere[0].path;
    }
    if (!restaurantData.logo && req.body.logoPath && isAllowedStoredPath(req.body.logoPath)) {
      restaurantData.logo = String(req.body.logoPath).trim();
    }
    if (!restaurantData.banniere && req.body.bannierePath && isAllowedStoredPath(req.body.bannierePath)) {
      restaurantData.banniere = String(req.body.bannierePath).trim();
    }
    if (req.body.visuelCarteAccueilPath && isAllowedStoredPath(req.body.visuelCarteAccueilPath)) {
      restaurantData.visuelCarteAccueil = String(req.body.visuelCarteAccueilPath).trim();
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

    const user = await User.findById(req.user._id);
    if (user) {
      user.restaurantId = restaurant._id;
      await user.save();
    }

    const created = await Restaurant.findById(restaurant._id).populate(populateCategories);
    res.status(201).json(created);
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

    const { nom, description, latitude, longitude, adresse, telephone, whatsapp, email, fraisLivraison, categorieId, joursVente, commanderVeille } = req.body;

    const catIdsFromForm = parseCategorieIdsFromBody(req.body);
    if (catIdsFromForm !== undefined) {
      setRestaurantCategories(restaurant, catIdsFromForm);
    } else if (categorieId !== undefined) {
      setRestaurantCategories(restaurant, categorieId ? [String(categorieId)] : []);
    }

    const parseJoursVenteBody = (raw) => {
      try {
        if (raw == null || raw === '') return undefined;
        if (Array.isArray(raw)) {
          return raw.map(Number).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(Number).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
        }
      } catch (_) { /* ignore */ }
      return undefined;
    };

    if (nom) restaurant.nom = nom;
    if (description !== undefined) restaurant.description = description;
    if (req.body.nomEn !== undefined) restaurant.nomEn = String(req.body.nomEn || '').trim();
    if (req.body.descriptionEn !== undefined) restaurant.descriptionEn = String(req.body.descriptionEn || '').trim();
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
    if (joursVente !== undefined) {
      const j = parseJoursVenteBody(joursVente);
      if (j !== undefined) restaurant.joursVente = j;
    }
    if (commanderVeille !== undefined) {
      restaurant.commanderVeille = commanderVeille === 'true' || commanderVeille === true;
    }

    // Gérer les uploads de fichiers
    if (req.files?.logo) {
      restaurant.logo = req.files.logo[0].path;
    }
    if (req.files?.banniere) {
      restaurant.banniere = req.files.banniere[0].path;
    }
    if (req.body.logoPath !== undefined) {
      const v = String(req.body.logoPath || '').trim();
      if (v === '') restaurant.logo = null;
      else if (isAllowedStoredPath(v)) restaurant.logo = v;
    }
    if (req.body.bannierePath !== undefined) {
      const v = String(req.body.bannierePath || '').trim();
      if (v === '') restaurant.banniere = null;
      else if (isAllowedStoredPath(v)) restaurant.banniere = v;
    }
    if (req.body.visuelCarteAccueilPath !== undefined) {
      const v = String(req.body.visuelCarteAccueilPath || '').trim();
      if (v === '') restaurant.visuelCarteAccueil = null;
      else if (isAllowedStoredPath(v)) restaurant.visuelCarteAccueil = v;
    }

    await restaurant.save();
    const updated = await Restaurant.findById(restaurant._id).populate(populateCategories);
    res.json(updated);
  } catch (error) {
    console.error('Erreur mise à jour restaurant:', error);
    res.status(500).json({ message: error.message || 'Erreur lors de la mise à jour du restaurant' });
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
