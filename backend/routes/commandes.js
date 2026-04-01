const express = require('express');
const crypto = require('crypto');
const Commande = require('../models/Commande');
const Restaurant = require('../models/Restaurant');
const { auth } = require('../middleware/auth');

const RECEIPT_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const { effectiveProduitPrice } = require('../utils/productPromo');

const router = express.Router();

// Middleware pour parser JSON et URL-encoded pour cette route uniquement
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Créer une commande (plats ou produits)
router.post('/', auth, async (req, res) => {
  try {
    const { restaurantId, plats, produits, adresseLivraison, modePaiement } = req.body;

    let adressePayload = adresseLivraison || {};
    if (adresseLivraison && typeof adresseLivraison === 'object') {
      adressePayload = {
        latitude: adresseLivraison.latitude,
        longitude: adresseLivraison.longitude,
        adresse: adresseLivraison.adresse,
        instruction: adresseLivraison.instruction || '',
        telephoneContact: adresseLivraison.telephoneContact || ''
      };
    }
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Structure non trouvée' });
    }

    let sousTotal = 0;
    const platsDetails = [];
    const produitsDetails = [];

    if (plats && plats.length > 0) {
      const Plat = require('../models/Plat');
      for (const item of plats) {
        const plat = await Plat.findById(item.platId);
        if (!plat) return res.status(404).json({ message: `Plat ${item.platId} non trouvé` });
        sousTotal += plat.prix * item.quantite;
        platsDetails.push({ plat: item.platId, quantite: item.quantite, prix: plat.prix });
      }
    }

    let commandeQualifieLivraisonGratuite = false;
    if (produits && produits.length > 0) {
      const Produit = require('../models/Produit');
      for (const item of produits) {
        const produit = await Produit.findById(item.produitId);
        if (!produit) return res.status(404).json({ message: `Produit ${item.produitId} non trouvé` });
        const prixLigne = effectiveProduitPrice(produit);
        sousTotal += prixLigne * item.quantite;
        produitsDetails.push({ produit: item.produitId, quantite: item.quantite, prix: prixLigne });
        if (produit.promoLivraisonGratuite) commandeQualifieLivraisonGratuite = true;
      }
    }

    if (platsDetails.length === 0 && produitsDetails.length === 0) {
      return res.status(400).json({ message: 'La commande doit contenir des plats ou des produits' });
    }

    const fraisLivraisonBase = restaurant.fraisLivraison || 0;
    const fraisLivraison = commandeQualifieLivraisonGratuite ? 0 : fraisLivraisonBase;
    const total = sousTotal + fraisLivraison;

    const modesValides = ['especes', 'momo_avant', 'momo_apres'];
    const mode = modesValides.includes(modePaiement) ? modePaiement : 'momo_avant';

    /** Espèces ou MoMo après livraison : commande validée tout de suite. MoMo avant : en attente jusqu’au paiement. */
    let statutInitial = 'en_attente';
    let paiementEnLigneEffectue = false;
    if (mode === 'especes' || mode === 'momo_apres') {
      statutInitial = 'confirmee';
    }

    const commande = new Commande({
      client: req.user._id,
      restaurant: restaurantId,
      plats: platsDetails,
      produits: produitsDetails,
      adresseLivraison: adressePayload,
      sousTotal,
      fraisLivraison,
      total,
      statut: statutInitial,
      modePaiement: mode,
      paiementEnLigneEffectue
    });

    await commande.save();
    await commande.populate('restaurant', 'nom logo fraisLivraison');
    await commande.populate('plats.plat', 'nom image prix');
    await commande.populate('produits.produit', 'nom images prix');

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
      .populate('produits.produit', 'nom images prix')
      .sort({ createdAt: -1 });

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Données reçu / facture (paiement en ligne uniquement) */
router.get('/:id/receipt', auth, async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id)
      .populate('restaurant', 'nom logo')
      .populate('client', 'nom email telephone')
      .populate('plats.plat', 'nom image prix')
      .populate('produits.produit', 'nom images prix');

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }
    const clientId = commande.client?._id || commande.client;
    if (clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (!commande.paiementEnLigneEffectue || commande.modePaiement !== 'momo_avant') {
      return res.status(400).json({ message: 'Aucun reçu numérique pour cette commande' });
    }

    if (!commande.receiptToken) {
      commande.receiptToken = crypto.randomBytes(24).toString('hex');
      commande.receiptExpiresAt = new Date(Date.now() + RECEIPT_VALIDITY_MS);
      await commande.save();
    }

    const expired = commande.receiptExpiresAt && new Date(commande.receiptExpiresAt) < new Date();
    const qrPayload = commande.receiptToken
      ? `RAPIDO|${commande._id}|${Number(commande.total).toFixed(0)}|${commande.receiptToken}`
      : '';

    res.json({
      commande,
      expired: !!expired,
      qrPayload,
      clientNom: commande.client?.nom || req.user.nom
    });
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
      .populate('produits.produit', 'nom images prix')
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
      if (commande.modePaiement === 'momo_avant') {
        commande.paiementEnLigneEffectue = true;
        if (!commande.receiptToken) {
          commande.receiptToken = crypto.randomBytes(24).toString('hex');
          commande.receiptExpiresAt = new Date(Date.now() + RECEIPT_VALIDITY_MS);
        }
      }
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
        .populate('produits.produit', 'nom images prix')
        .sort({ createdAt: -1 });
    } else {
      commandes = await Commande.find()
        .populate('restaurant', 'nom')
        .populate('client', 'nom email')
        .populate('plats.plat', 'nom')
        .populate('produits.produit', 'nom')
        .sort({ createdAt: -1 });
    }

    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
