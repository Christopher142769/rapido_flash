const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const Commande = require('../models/Commande');
const ShopOrder = require('../models/ShopOrder');
const MealOrder = require('../models/MealOrder');
const Conversation = require('../models/Conversation');
const { staffShopListFilter } = require('../utils/responsableAccess');

const router = express.Router();

/**
 * Résumé pour badges / polling : commandes en attente + messages non lus
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const user = req.user;

    if (['restaurant', 'gestionnaire', 'commercial'].includes(user.role)) {
      const owned = await Restaurant.find({
        $or: [{ proprietaire: user._id }, { gestionnaires: user._id }],
      })
        .select('_id')
        .lean();
      const rids = owned.map((r) => r._id);
      let pendingOrders = 0;
      let unreadMessages = 0;
      const shopPending = await ShopOrder.countDocuments({
        statut: 'en_attente',
        ...staffShopListFilter(user),
      });
      if (rids.length > 0) {
        pendingOrders = await Commande.countDocuments({
          restaurant: { $in: rids },
          statut: 'en_attente',
        });
        const agg = await Conversation.aggregate([
          { $match: { restaurant: { $in: rids } } },
          { $group: { _id: null, total: { $sum: '$unreadRestaurant' } } },
        ]);
        unreadMessages = agg[0]?.total || 0;
      }
      pendingOrders += shopPending;

      const { start, end } = (() => {
        const now = new Date();
        const s = new Date(now);
        s.setHours(0, 0, 0, 0);
        const e = new Date(now);
        e.setHours(23, 59, 59, 999);
        return { start: s, end: e };
      })();

      const todayRelances = await ShopOrder.countDocuments({
        commercialStatus: 'relance',
        scheduledDeliveryAt: { $gte: start, $lte: end },
        ...staffShopListFilter(user),
      });

      return res.json({
        role: user.role === 'commercial' ? 'commercial' : 'staff',
        pendingOrders,
        unreadMessages,
        todayRelances,
        total: pendingOrders + unreadMessages + todayRelances,
      });
    }

    if (user.role === 'responsable') {
      const pendingOrders = await ShopOrder.countDocuments({
        statut: 'en_attente',
        ...staffShopListFilter(user),
      });
      return res.json({
        role: 'responsable',
        pendingOrders,
        unreadMessages: 0,
        todayRelances: 0,
        total: pendingOrders,
      });
    }

    if (user.role === 'cuisinier') {
      const pendingOrders = await MealOrder.countDocuments({ statut: 'en_attente' });
      return res.json({
        role: 'cuisinier',
        pendingOrders,
        unreadMessages: 0,
        todayRelances: 0,
        total: pendingOrders,
      });
    }

    if (user.role === 'client') {
      const clientId = new mongoose.Types.ObjectId(String(user._id));
      const agg = await Conversation.aggregate([
        { $match: { client: clientId } },
        { $group: { _id: null, total: { $sum: '$unreadClient' } } },
      ]);
      const unreadMessages = agg[0]?.total || 0;
      return res.json({
        role: 'client',
        pendingOrders: 0,
        unreadMessages,
        total: unreadMessages,
      });
    }

    return res.status(403).json({ message: 'Accès refusé' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
