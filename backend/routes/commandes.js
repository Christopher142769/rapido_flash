const express = require('express');
const Commande = require('../models/Commande');
const Restaurant = require('../models/Restaurant');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware pour parser JSON et URL-encoded pour cette route uniquement
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Créer une commande
router.post('/', auth, async (req, res) => {
  try {
    const { restaurantId, plats, adresseLivraison } = req.body;

    // Récupérer le restaurant pour obtenir les frais de livraison
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }

    let sousTotal = 0;
    const platsDetails = [];

    for (const item of plats) {
      const Plat = require('../models/Plat');
      const plat = await Plat.findById(item.platId);
      if (!plat) {
        return res.status(404).json({ message: `Plat ${item.platId} non trouvé` });
      }
      const itemTotal = plat.prix * item.quantite;
      sousTotal += itemTotal;
      platsDetails.push({
        plat: item.platId,
        quantite: item.quantite,
        prix: plat.prix
      });
    }

    // Ajouter les frais de livraison
    const fraisLivraison = restaurant.fraisLivraison || 0;
    const total = sousTotal + fraisLivraison;

    const commande = new Commande({
      client: req.user._id,
      restaurant: restaurantId,
      plats: platsDetails,
      adresseLivraison,
      sousTotal,
      fraisLivraison,
      total
    });

    await commande.save();
    await commande.populate('restaurant', 'nom logo fraisLivraison');
    await commande.populate('plats.plat', 'nom image prix');

    res.status(201).json(commande);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les commandes du client
router.get('/my-commandes', auth, async (req, res) => {
  try {
    const commandes = await Commande.find({ client: req.user._id })
      .populate('restaurant', 'nom logo')
      .populate('plats.plat', 'nom image prix')
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les commandes d'un restaurant
router.get('/restaurant/:restaurantId', auth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant non trouvé' });
    }

    // Vérifier les permissions
    if (restaurant.proprietaire.toString() !== req.user._id.toString() && 
        !restaurant.gestionnaires.includes(req.user._id)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const commandes = await Commande.find({ restaurant: req.params.restaurantId })
      .populate('client', 'nom email telephone position')
      .populate('plats.plat', 'nom image prix')
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour le statut d'une commande
router.put('/:id/statut', auth, async (req, res) => {
  try {
    const { statut } = req.body;
    const commande = await Commande.findById(req.params.id)
      .populate('restaurant');

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    // Vérifier les permissions : le client peut confirmer son propre paiement, le restaurant peut changer le statut
    const isClient = commande.client.toString() === req.user._id.toString();
    const restaurant = commande.restaurant;
    const isRestaurantOwner = restaurant.proprietaire.toString() === req.user._id.toString();
    const isRestaurantManager = restaurant.gestionnaires && restaurant.gestionnaires.includes(req.user._id);

    // Le client peut seulement confirmer le paiement (statut: 'confirmee')
    if (isClient && statut === 'confirmee') {
      commande.statut = statut;
      await commande.save();
      return res.json(commande);
    }

    // Le restaurant peut changer le statut
    if (isRestaurantOwner || isRestaurantManager) {
      commande.statut = statut;
      await commande.save();
      return res.json(commande);
    }

    return res.status(403).json({ message: 'Accès refusé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir toutes les commandes (dashboard)
router.get('/all', auth, async (req, res) => {
  try {
    // Seuls les restaurants peuvent voir toutes leurs commandes
    if (req.user.role !== 'restaurant' && req.user.role !== 'gestionnaire') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    let commandes;
    if (req.user.restaurantId) {
      commandes = await Commande.find({ restaurant: req.user.restaurantId })
        .populate('client', 'nom email telephone position')
        .populate('plats.plat', 'nom image prix')
        .sort({ createdAt: -1 });
    } else {
      commandes = await Commande.find()
        .populate('restaurant', 'nom')
        .populate('client', 'nom email')
        .populate('plats.plat', 'nom')
        .sort({ createdAt: -1 });
    }

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
