const express = require('express');
const crypto = require('crypto');
const Commande = require('../models/Commande');
const ShopOrder = require('../models/ShopOrder');
const Restaurant = require('../models/Restaurant');
const { auth } = require('../middleware/auth');

const RECEIPT_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const { effectiveProduitPrice } = require('../utils/productPromo');
const { sendToUserId, sendToUserIds } = require('../services/pushNotifications');
const { notifyCommandeCreated } = require('../services/orderNotificationMailer');
const PromoCode = require('../models/PromoCode');
const { validatePromoCodeForOrder } = require('../utils/promoEngine');
const { buildPeriodFilter } = require('../utils/commercialBilan');

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

/** Jour civil Bénin — aligné Commandes Shop / filtres commerciaux. */
function beninTodayISO(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo' }).format(date);
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

    void notifyCommandeCreated(
      commande.toObject ? commande.toObject() : commande,
      restaurant
    ).catch((err) => {
      console.error('Notification e-mail commande:', err.message);
    });

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
 * Statistiques dashboard (KPI + série + CA par ville + filtre produit).
 * Query: from, to, productId, productKind (all|shop|meal|restaurant)
 */
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    if (!['restaurant', 'gestionnaire'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const mongoose = require('mongoose');
    const Conversation = require('../models/Conversation');
    const MealOrder = require('../models/MealOrder');
    const MealProduct = require('../models/MealProduct');
    const ShopProduct = require('../models/ShopProduct');
    const Produit = require('../models/Produit');
    const Plat = require('../models/Plat');

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

    const todayIso = beninTodayISO();
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
    const periodFilter = buildPeriodFilter(fromStr, toStr) || {};
    const cmdPeriodFilter = periodFilter.createdAt
      ? { createdAt: periodFilter.createdAt }
      : periodFilter.$expr
        ? periodFilter
        : { createdAt: { $gte: start, $lte: end } };

    let productKind = String(req.query.productKind || 'all').toLowerCase();
    let productId = String(req.query.productId || '').trim();
    if (!['all', 'shop', 'meal', 'restaurant'].includes(productKind)) productKind = 'all';
    if (productKind === 'all') productId = '';
    if (productId && !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Produit invalide' });
    }
    const productOid = productId ? new mongoose.Types.ObjectId(productId) : null;

    const [shopProductDocs, mealProductDocs, restaurantProduitDocs, restaurantPlatDocs] =
      await Promise.all([
        ShopProduct.find({}).select('_id name').sort({ name: 1 }).lean(),
        MealProduct.find({}).select('_id name').sort({ name: 1 }).lean(),
        ids.length
          ? Produit.find({ restaurant: { $in: ids } }).select('_id nom').sort({ nom: 1 }).lean()
          : Promise.resolve([]),
        ids.length
          ? Plat.find({ 'restaurants.restaurant': { $in: ids } })
              .select('_id nom')
              .sort({ nom: 1 })
              .lean()
          : Promise.resolve([]),
      ]);

    const products = [
      ...shopProductDocs.map((p) => ({
        id: String(p._id),
        name: p.name,
        kind: 'shop',
        label: `Shop · ${p.name}`,
      })),
      ...mealProductDocs.map((p) => ({
        id: String(p._id),
        name: p.name,
        kind: 'meal',
        label: `Repas · ${p.name}`,
      })),
      ...restaurantProduitDocs.map((p) => ({
        id: String(p._id),
        name: p.nom,
        kind: 'restaurant',
        label: `Catalogue · ${p.nom}`,
      })),
      ...restaurantPlatDocs.map((p) => ({
        id: String(p._id),
        name: p.nom,
        kind: 'restaurant',
        label: `Plat · ${p.nom}`,
      })),
    ];

    const includeShop = productKind === 'all' || productKind === 'shop';
    const includeMeal = productKind === 'all' || productKind === 'meal';
    const includeRestaurant =
      (productKind === 'all' || productKind === 'restaurant') && ids.length > 0;

    const bucketExpr = (dateField) =>
      sameDay
        ? {
            $dateToString: {
              format: '%H',
              date: dateField,
              timezone: 'Africa/Porto-Novo',
            },
          }
        : {
            $dateToString: {
              format: '%Y-%m-%d',
              date: dateField,
              timezone: 'Africa/Porto-Novo',
            },
          };

    const shopDateField = { $ifNull: ['$orderDate', '$createdAt'] };
    const mealDateField = { $ifNull: ['$orderDate', '$createdAt'] };

    function mergeStatus(into, rows) {
      for (const row of rows || []) {
        if (row._id && Object.prototype.hasOwnProperty.call(into, row._id)) {
          into[row._id] += row.count || 0;
        }
      }
    }

    function mergeCityMap(map, rows) {
      for (const row of rows || []) {
        const city = String(row._id || 'Autre').trim() || 'Autre';
        if (!map.has(city)) {
          map.set(city, { city, orderCount: 0, montantTotal: 0, chiffreAffaires: 0 });
        }
        const cur = map.get(city);
        cur.orderCount += row.orderCount || 0;
        cur.montantTotal += row.montantTotal || 0;
        cur.chiffreAffaires += row.chiffreAffaires || 0;
      }
    }

    function mergeBucketMap(map, rows) {
      for (const row of rows || []) {
        if (row._id == null) continue;
        map[row._id] = (map[row._id] || 0) + (row.count || 0);
      }
    }

    const countsByStatus = { ...emptyCounts };
    let montantTotalCommandes = 0;
    let chiffreAffaires = 0;
    const cityMap = new Map();
    const bucketMap = {};

    const tasks = [];

    if (includeShop) {
      const shopMatch = {
        ...periodFilter,
        ...(productOid ? { shopProduct: productOid } : {}),
      };
      tasks.push(
        ShopOrder.aggregate([
          { $match: shopMatch },
          {
            $facet: {
              byStatus: [{ $group: { _id: '$statut', count: { $sum: 1 } } }],
              amounts: [
                {
                  $group: {
                    _id: null,
                    totalMontant: {
                      $sum: { $cond: [{ $ne: ['$statut', 'annulee'] }, '$totalPrice', 0] },
                    },
                    chiffreAffaires: {
                      $sum: { $cond: [{ $eq: ['$statut', 'livree'] }, '$totalPrice', 0] },
                    },
                  },
                },
              ],
              byBucket: [
                {
                  $group: {
                    _id: bucketExpr(shopDateField),
                    count: { $sum: 1 },
                  },
                },
              ],
              byCity: [
                {
                  $group: {
                    _id: {
                      $let: {
                        vars: {
                          c: { $ifNull: ['$customer.city', ''] },
                          loc: { $ifNull: ['$offPlatformLocation', ''] },
                        },
                        in: {
                          $cond: [
                            { $and: [{ $ne: ['$$c', ''] }, { $ne: ['$$c', null] }] },
                            '$$c',
                            {
                              $cond: [
                                { $regexMatch: { input: '$$loc', regex: /calavi/i } },
                                'Calavi',
                                {
                                  $cond: [
                                    { $regexMatch: { input: '$$loc', regex: /cotonou/i } },
                                    'Cotonou',
                                    'Autre',
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      },
                    },
                    orderCount: { $sum: 1 },
                    montantTotal: {
                      $sum: { $cond: [{ $ne: ['$statut', 'annulee'] }, '$totalPrice', 0] },
                    },
                    chiffreAffaires: {
                      $sum: { $cond: [{ $eq: ['$statut', 'livree'] }, '$totalPrice', 0] },
                    },
                  },
                },
                { $sort: { chiffreAffaires: -1 } },
              ],
            },
          },
        ]).then((rows) => ({ source: 'shop', facet: rows[0] || {} }))
      );
    }

    if (includeMeal) {
      const mealMatch = {
        ...periodFilter,
        ...(productOid ? { 'items.mealProduct': productOid } : {}),
      };
      tasks.push(
        MealOrder.aggregate([
          { $match: mealMatch },
          {
            $facet: {
              byStatus: [{ $group: { _id: '$statut', count: { $sum: 1 } } }],
              amounts: [
                {
                  $group: {
                    _id: null,
                    totalMontant: {
                      $sum: { $cond: [{ $ne: ['$statut', 'annulee'] }, '$totalPrice', 0] },
                    },
                    chiffreAffaires: {
                      $sum: { $cond: [{ $eq: ['$statut', 'livree'] }, '$totalPrice', 0] },
                    },
                  },
                },
              ],
              byBucket: [
                {
                  $group: {
                    _id: bucketExpr(mealDateField),
                    count: { $sum: 1 },
                  },
                },
              ],
              byCity: [
                {
                  $group: {
                    _id: { $ifNull: ['$customer.city', 'Autre'] },
                    orderCount: { $sum: 1 },
                    montantTotal: {
                      $sum: { $cond: [{ $ne: ['$statut', 'annulee'] }, '$totalPrice', 0] },
                    },
                    chiffreAffaires: {
                      $sum: { $cond: [{ $eq: ['$statut', 'livree'] }, '$totalPrice', 0] },
                    },
                  },
                },
                { $sort: { chiffreAffaires: -1 } },
              ],
            },
          },
        ]).then((rows) => ({ source: 'meal', facet: rows[0] || {} }))
      );
    }

    if (includeRestaurant) {
      const cmdMatch = {
        restaurant: { $in: ids },
        ...(periodFilter.$expr ? periodFilter : cmdPeriodFilter),
      };
      if (productOid) {
        cmdMatch.$or = [{ 'produits.produit': productOid }, { 'plats.plat': productOid }];
      }
      tasks.push(
        Commande.aggregate([
          { $match: cmdMatch },
          {
            $facet: {
              byStatus: [{ $group: { _id: '$statut', count: { $sum: 1 } } }],
              amounts: [
                {
                  $group: {
                    _id: null,
                    totalMontant: {
                      $sum: { $cond: [{ $ne: ['$statut', 'annulee'] }, '$total', 0] },
                    },
                    chiffreAffaires: {
                      $sum: { $cond: [{ $eq: ['$statut', 'livree'] }, '$total', 0] },
                    },
                  },
                },
              ],
              byBucket: [
                {
                  $group: {
                    _id: bucketExpr('$createdAt'),
                    count: { $sum: 1 },
                  },
                },
              ],
              byCity: [
                {
                  $group: {
                    _id: 'App',
                    orderCount: { $sum: 1 },
                    montantTotal: {
                      $sum: { $cond: [{ $ne: ['$statut', 'annulee'] }, '$total', 0] },
                    },
                    chiffreAffaires: {
                      $sum: { $cond: [{ $eq: ['$statut', 'livree'] }, '$total', 0] },
                    },
                  },
                },
              ],
            },
          },
        ]).then((rows) => ({ source: 'restaurant', facet: rows[0] || {} }))
      );
    }

    const results = await Promise.all(tasks);
    for (const { facet } of results) {
      mergeStatus(countsByStatus, facet.byStatus);
      const amounts = facet.amounts?.[0] || {};
      montantTotalCommandes += amounts.totalMontant || 0;
      chiffreAffaires += amounts.chiffreAffaires || 0;
      mergeBucketMap(bucketMap, facet.byBucket);
      mergeCityMap(cityMap, facet.byCity);
    }

    const totalCommandes = Object.values(countsByStatus).reduce((a, b) => a + b, 0);

    let series = [];
    if (sameDay) {
      for (let h = 0; h < 24; h += 1) {
        const key = String(h).padStart(2, '0');
        series.push({
          label: `${key}h`,
          count: bucketMap[key] || bucketMap[String(h)] || 0,
        });
      }
    } else {
      const cur = new Date(start);
      const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
      while (cur <= last) {
        const key = isoDateUtc(cur);
        series.push({ label: key, count: bucketMap[key] || 0 });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    const byCity = Array.from(cityMap.values()).sort(
      (a, b) => b.chiffreAffaires - a.chiffreAffaires || b.orderCount - a.orderCount
    );

    res.json({
      from: fromStr,
      to: toStr,
      granularity: sameDay ? 'hour' : 'day',
      productKind: productKind || 'all',
      productId: productId || '',
      products,
      enterpriseCount,
      unreadMessages,
      countsByStatus,
      totalCommandes,
      montantTotalCommandes,
      chiffreAffaires,
      series,
      byCity,
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

      /* Propriétaires / gestionnaires (y compris celui qui valide sur le web) : alerte multi-appareils */
      const staffIds = [restaurant.proprietaire, ...(restaurant.gestionnaires || [])]
        .map((id) => String(id))
        .filter((id) => id);
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
