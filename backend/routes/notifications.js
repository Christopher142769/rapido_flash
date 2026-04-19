const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Restaurant = require('../models/Restaurant');
const Commande = require('../models/Commande');
const Conversation = require('../models/Conversation');

const router = express.Router();

/**
 * Résumé pour badges / polling : commandes en attente + messages non lus
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const user = req.user;

    if (['restaurant', 'gestionnaire'].includes(user.role)) {
      const owned = await Restaurant.find({
        $or: [{ proprietaire: user._id }, { gestionnaires: user._id }],
      })
        .select('_id')
        .lean();
      const rids = owned.map((r) => r._id);
      let pendingOrders = 0;
      let unreadMessages = 0;
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
      return res.json({
        role: 'staff',
        pendingOrders,
        unreadMessages,
        total: pendingOrders + unreadMessages,
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
