const express = require('express');
const crypto = require('crypto');
const Commande = require('../models/Commande');
const Restaurant = require('../models/Restaurant');
const { auth } = require('../middleware/auth');

const RECEIPT_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const { effectiveProduitPrice } = require('../utils/productPromo');
const { sendToUserId, sendToUserIds } = require('../services/pushNotifications');
const PromoCode = require('../models/PromoCode');
const { validatePromoCodeForOrder } = require('../utils/promoEngine');

const STATUT_LABELS_CLIENT = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

const router = express.Router();

function isReceiptEligible(commande) {
  const mode = String(commande?.modePaiement || '');
  if (mode === 'momo_avant') {
    return !!commande?.paiementEnLigneEffectue;
  }
  if (mode === 'especes' || mode === 'momo_apres') {
    return String(commande?.statut || '') === 'livree';
  }
  return false;
}

function utcDayStart(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function utcDayEnd(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

function isoDateUtc(d) {
  return d.toISOString().slice(0, 10);
}

// Middleware pour parser JSON et URL-encoded pour cette route uniquement
router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Créer une commande (plats ou produits)
router.post('/', auth, async (req, res) => {
  try {
    const { restaurantId, plats, produits, adresseLivraison, modePaiement, promoCode } = req.body;

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
    const deliveryPhoneDigits = String(adressePayload.telephoneContact || '').replace(/\D/g, '');
    if (deliveryPhoneDigits.length < 8) {
      return res.status(400).json({
        message: 'Le numéro pour la livraison est obligatoire (minimum 8 chiffres).'
      });
    }
    const instructionTrim = String(adressePayload.instruction || '').trim();
    if (instructionTrim.length < 3) {
      return res.status(400).json({
        message: 'Les indications pour le livreur sont obligatoires.'
      });
    }
    adressePayload.instruction = instructionTrim;
    adressePayload.telephoneContact = String(adressePayload.telephoneContact || '').trim();
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
        const quantite = Number(item.quantite);
        if (!Number.isFinite(quantite) || quantite <= 0) {
          return res.status(400).json({ message: 'Quantité produit invalide.' });
        }
        const prixBase = effectiveProduitPrice(produit);
        const selected = Array.isArray(item.accompagnements) ? item.accompagnements : [];
        const accompagnementsActifs = (produit.accompagnements || []).filter((a) => a?.actif !== false);
        if (accompagnementsActifs.length > 0 && selected.length === 0) {
          return res.status(400).json({
            message: `Veuillez choisir au moins un accompagnement pour ${produit.nom}.`
          });
        }
        if (String(produit.accompagnementsMode || 'multiple') === 'unique' && selected.length > 1) {
          return res.status(400).json({
            message: `Un seul accompagnement est autorisé pour ${produit.nom}.`
          });
        }
        const choix = [];
        let supplementTotal = 0;
        for (const raw of selected) {
          const optionId = String(raw?.optionId || raw?._id || '');
          if (!optionId) continue;
          const opt = (produit.accompagnements || []).find((a) => String(a._id) === optionId && a.actif !== false);
          if (!opt) continue;
          const supp = Math.max(0, Number(opt.prixSupp || 0));
          supplementTotal += supp;
          choix.push({
            optionId: opt._id,
            nom: opt.nom,
            nomEn: opt.nomEn || '',
            prixSupp: supp,
          });
        }
        const prixUnitaire = prixBase + supplementTotal;
        sousTotal += prixUnitaire * quantite;
        produitsDetails.push({
          produit: item.produitId,
          quantite,
          prix: prixUnitaire,
          prixBase,
          supplementTotal,
          accompagnements: choix,
        });
        if (produit.promoLivraisonGratuite) commandeQualifieLivraisonGratuite = true;
      }
    }

    if (platsDetails.length === 0 && produitsDetails.length === 0) {
      return res.status(400).json({ message: 'La commande doit contenir des plats ou des produits' });
    }

    const fraisLivraisonBase = restaurant.fraisLivraison || 0;
    const fraisLivraison = commandeQualifieLivraisonGratuite ? 0 : fraisLivraisonBase;
    let promoDiscountAmount = 0;
    let promoDiscountPercent = 0;
    let promoOfferId = null;
    let promoCodeApplied = '';
    let promoUseTrackedCode = false;

    if (String(promoCode || '').trim()) {
      const promoResult = await validatePromoCodeForOrder({
        code: promoCode,
        userId: req.user._id,
        restaurantId,
        produits: produitsDetails.map((p) => ({
          produitId: p.produit,
          quantite: p.quantite,
          prix: p.prix,
        })),
      });
      if (!promoResult.ok) {
        return res.status(400).json({ message: promoResult.message || 'Code promo invalide.' });
      }
      promoDiscountAmount = promoResult.discountAmount;
      promoDiscountPercent = promoResult.discountPercent;
      promoOfferId = promoResult.offer._id;
      promoCodeApplied = promoResult.appliedCode;
      promoUseTrackedCode = !!promoResult.useTrackedByPromoCode;
    }

    const total = Math.max(0, sousTotal + fraisLivraison - promoDiscountAmount);

    const modesValides = ['especes', 'momo_avant', 'momo_apres'];
    const mode = modesValides.includes(modePaiement) ? modePaiement : 'momo_avant';

    /** Toute nouvelle commande reste « en attente » jusqu’à traitement (structure / plateforme / paiement en ligne). */
    const statutInitial = 'en_attente';
    let paiementEnLigneEffectue = false;

    const commande = new Commande({
      client: req.user._id,
      restaurant: restaurantId,
      plats: platsDetails,
      produits: produitsDetails,
      adresseLivraison: adressePayload,
      sousTotal,
      fraisLivraison,
      total,
      promoOffer: promoOfferId,
      promoCode: promoCodeApplied,
      promoDiscountAmount,
      promoDiscountPercent,
      statut: statutInitial,
      modePaiement: mode,
      paiementEnLigneEffectue
    });

    await commande.save();

    if (promoCodeApplied && promoUseTrackedCode) {
      await PromoCode.updateOne(
        { code: promoCodeApplied, restaurant: restaurantId, status: 'active' },
        {
          $inc: { useCount: 1 },
          $set: { usedByOrder: commande._id, usedByUser: req.user._id, usedAt: new Date() },
        }
      );
    }
    await commande.populate('restaurant', 'nom logo fraisLivraison');
    await commande.populate('plats.plat', 'nom image prix');
    await commande.populate('produits.produit', 'nom images prix');

    void sendToUserIds(
      [restaurant.proprietaire, ...(restaurant.gestionnaires || [])].map((id) => String(id)),
      {
        title: 'Rapido — Nouvelle commande',
        body: `Nouvelle commande pour ${restaurant.nom}`,
        url: '/dashboard/commandes',
        tag: `rapido-order-${commande._id}`,
      }
    ).catch(() => {});

    res.status(201).json(commande);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Toutes les commandes des entreprises dont l'utilisateur est propriétaire ou gestionnaire
 */
router.get('/for-my-restaurants', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const owned = await Restaurant.find({
      $or: [{ proprietaire: req.user._id }, { gestionnaires: req.user._id }],
    })
      .select('_id')
      .lean();
    const ids = owned.map((r) => r._id);
    if (ids.length === 0) {
      return res.json([]);
    }
    const commandes = await Commande.find({ restaurant: { $in: ids } })
      .populate('restaurant', 'nom logo')
      .populate('client', 'nom email telephone position')
      .populate('plats.plat', 'nom image prix')
      .populate('produits.produit', 'nom images prix')
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Statistiques dashboard (KPI + série temporelle) pour les entreprises accessibles.
 * Query: from=YYYY-MM-DD&to=YYYY-MM-DD (optionnel → jour courant UTC si absent).
 */
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const Conversation = require('../models/Conversation');

    const owned = await Restaurant.find({
      $or: [{ proprietaire: req.user._id }, { gestionnaires: req.user._id }],
    })
      .select('_id')
      .lean();
    const ids = owned.map((r) => r._id);
    const enterpriseCount = ids.length;

    let unreadMessages = 0;
    if (ids.length > 0) {
      const mAgg = await Conversation.aggregate([
        { $match: { restaurant: { $in: ids } } },
        { $group: { _id: null, total: { $sum: '$unreadRestaurant' } } },
      ]);
      unreadMessages = mAgg[0]?.total || 0;
    }

    const emptyCounts = {
      en_attente: 0,
      confirmee: 0,
      en_preparation: 0,
      en_livraison: 0,
      livree: 0,
      annulee: 0,
    };

    if (ids.length === 0) {
      const today = isoDateUtc(new Date());
      return res.json({
        from: today,
        to: today,
        granularity: 'hour',
        enterpriseCount: 0,
        unreadMessages: 0,
        countsByStatus: { ...emptyCounts },
        totalCommandes: 0,
        series: Array.from({ length: 24 }, (_, h) => ({
          label: `${String(h).padStart(2, '0')}h`,
          count: 0,
        })),
      });
    }

    const todayIso = isoDateUtc(new Date());
    let fromStr = req.query.from;
    let toStr = req.query.to;
    if (!fromStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(fromStr))) {
      fromStr = todayIso;
    }
    if (!toStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(toStr))) {
      toStr = fromStr;
    }
    if (String(fromStr) > String(toStr)) {
      const swap = fromStr;
      fromStr = toStr;
      toStr = swap;
    }

    const start = utcDayStart(fromStr);
    const end = utcDayEnd(toStr);
    const daysSpan = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (daysSpan > 400) {
      return res.status(400).json({ message: 'Période trop longue (max. ~400 jours).' });
    }

    const sameDay = fromStr === toStr;
    const match = { restaurant: { $in: ids }, createdAt: { $gte: start, $lte: end } };

    const [agg] = await Commande.aggregate([
      { $match: match },
      {
        $facet: {
          byStatus: [{ $group: { _id: '$statut', count: { $sum: 1 } } }],
          byBucket: sameDay
            ? [
                { $group: { _id: { $dateToString: { format: '%H', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ]
            : [
                {
                  $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                  },
                },
                { $sort: { _id: 1 } },
              ],
        },
      },
    ]);

    const countsByStatus = { ...emptyCounts };
    for (const row of agg.byStatus || []) {
      if (row._id && Object.prototype.hasOwnProperty.call(countsByStatus, row._id)) {
        countsByStatus[row._id] = row.count;
      }
    }

    const totalCommandes = Object.values(countsByStatus).reduce((a, b) => a + b, 0);

    let series = [];
    if (sameDay) {
      const mapH = {};
      for (const b of agg.byBucket || []) {
        const h = parseInt(b._id, 10);
        if (!Number.isNaN(h)) mapH[h] = b.count;
      }
      for (let h = 0; h < 24; h += 1) {
        series.push({ label: `${String(h).padStart(2, '0')}h`, count: mapH[h] || 0 });
      }
    } else {
      const mapD = {};
      for (const b of agg.byBucket || []) {
        if (b._id) mapD[b._id] = b.count;
      }
      const cur = new Date(start);
      const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
      while (cur <= last) {
        const key = isoDateUtc(cur);
        series.push({ label: key, count: mapD[key] || 0 });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    res.json({
      from: fromStr,
      to: toStr,
      granularity: sameDay ? 'hour' : 'day',
      enterpriseCount,
      unreadMessages,
      countsByStatus,
      totalCommandes,
      series,
    });
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

/** Données reçu / facture */
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
    if (!isReceiptEligible(commande)) {
      return res.status(400).json({ message: 'La facture n’est pas encore disponible pour cette commande' });
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

    // Le client peut confirmer le paiement (statut: 'confirmee')
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
      void sendToUserIds(
        [restaurant.proprietaire, ...(restaurant.gestionnaires || [])].map((id) => String(id)),
        {
          title: 'Rapido — Paiement',
          body: 'Un client a confirmé le paiement d’une commande.',
          url: '/dashboard/commandes',
          tag: `rapido-pay-${commande._id}`,
        }
      ).catch(() => {});
      return res.json(commande);
    }

    // Le client peut annuler sa commande tant qu'elle n'est pas en préparation / en livraison / livrée
    if (isClient && statut === 'annulee') {
      const cancellableStatuses = ['en_attente', 'confirmee'];
      if (!cancellableStatuses.includes(String(commande.statut))) {
        return res.status(400).json({
          message: 'Cette commande ne peut plus être annulée.',
        });
      }
      commande.statut = 'annulee';
      await commande.save();
      void sendToUserIds(
        [restaurant.proprietaire, ...(restaurant.gestionnaires || [])].map((id) => String(id)),
        {
          title: 'Rapido — Commande annulée',
          body: 'Un client a annulé sa commande.',
          url: '/dashboard/commandes',
          tag: `rapido-cancel-${commande._id}`,
        }
      ).catch(() => {});
      return res.json(commande);
    }

    // Le restaurant peut changer le statut
    if (isRestaurantOwner || isRestaurantManager) {
      commande.statut = statut;
      await commande.save();
      const clientId = commande.client?._id || commande.client;
      const receiptReady =
        statut === 'livree' &&
        ['especes', 'momo_apres'].includes(String(commande.modePaiement || ''));
      void sendToUserId(clientId, receiptReady
        ? {
            title: 'Rapido — Facture prête',
            body: 'Votre facture est disponible. Vous pouvez la consulter maintenant.',
            url: '/factures',
            tag: `rapido-receipt-${commande._id}`,
          }
        : {
            title: 'Rapido — Votre commande',
            body: `Statut : ${STATUT_LABELS_CLIENT[statut] || statut}`,
            url: '/orders',
            tag: `rapido-ord-${commande._id}-${statut}`,
          }).catch(() => {});

      /* Autres propriétaires / gestionnaires (pas celui qui valide sur le web) : alerte multi-appareils */
      const actorId = String(req.user._id);
      const staffIds = [restaurant.proprietaire, ...(restaurant.gestionnaires || [])]
        .map((id) => String(id))
        .filter((id) => id && id !== actorId);
      if (staffIds.length) {
        const label = STATUT_LABELS_CLIENT[statut] || statut;
        void sendToUserIds(staffIds, {
          title: 'Rapido — Commande',
          body: `Mise à jour : ${label}`,
          url: '/dashboard/commandes',
          tag: `rapido-staff-ord-${commande._id}-${statut}`,
        }).catch(() => {});
      }
      return res.json(commande);
    }

    return res.status(403).json({ message: 'Accès refusé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obtenir toutes les commandes (dashboard) — limité aux entreprises de l'utilisateur (ne plus exposer toute la base)
router.get('/all', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    const owned = await Restaurant.find({
      $or: [{ proprietaire: req.user._id }, { gestionnaires: req.user._id }],
    })
      .select('_id')
      .lean();
    const ids = owned.map((r) => r._id);
    if (ids.length === 0) {
      return res.json([]);
    }
    const commandes = await Commande.find({ restaurant: { $in: ids } })
      .populate('restaurant', 'nom logo')
      .populate('client', 'nom email telephone position')
      .populate('plats.plat', 'nom image prix')
      .populate('produits.produit', 'nom images prix')
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
