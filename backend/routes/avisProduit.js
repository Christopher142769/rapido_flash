const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const AvisProduit = require('../models/AvisProduit');
const Produit = require('../models/Produit');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { auth, isRestaurant } = require('../middleware/auth');

const router = express.Router();

async function canManageRestaurant(userId, restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return false;
  if (restaurant.proprietaire.toString() === userId.toString()) return true;
  return (restaurant.gestionnaires || []).some((g) => g.toString() === userId.toString());
}

function computeStats(avisList) {
  const n = avisList.length;
  if (n === 0) {
    return { moyenne: null, nombre: 0, repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  }
  const repartition = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const a of avisList) {
    const note = Math.min(5, Math.max(1, Math.round(Number(a.note))));
    repartition[note] = (repartition[note] || 0) + 1;
    sum += note;
  }
  return {
    moyenne: Math.round((sum / n) * 10) / 10,
    nombre: n,
    repartition
  };
}

/** Avis publics + stats pour un produit */
router.get('/produit/:produitId', async (req, res) => {
  try {
    const { produitId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: 'Identifiant produit invalide' });
    }
    const list = await AvisProduit.find({ produit: produitId })
      .populate('client', 'nom')
      .sort({ createdAt: -1 })
      .lean();

    let monAvis = null;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        const u = await User.findById(decoded.id).select('role');
        if (u && u.role === 'client') {
          const mine = list.find((a) => String(a.client?._id) === String(u._id));
          if (mine) {
            monAvis = { note: mine.note, commentaire: mine.commentaire || '' };
          }
        }
      } catch (_) {
        /* token invalide : ignorer */
      }
    }

    const avis = list.map((a) => ({
      _id: a._id,
      note: a.note,
      commentaire: a.commentaire || '',
      createdAt: a.createdAt,
      auteur: a.client?.nom ? String(a.client.nom).trim() || 'Client' : 'Client'
    }));

    res.json({ avis, stats: computeStats(list), monAvis });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Créer ou mettre à jour son avis (client uniquement) */
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Seuls les comptes clients peuvent publier un avis' });
    }
    const { produitId, note, commentaire } = req.body;
    if (!produitId || !mongoose.Types.ObjectId.isValid(produitId)) {
      return res.status(400).json({ message: 'produitId requis' });
    }
    const n = parseInt(String(note), 10);
    if (Number.isNaN(n) || n < 1 || n > 5) {
      return res.status(400).json({ message: 'La note doit être entre 1 et 5' });
    }

    const produit = await Produit.findById(produitId).select('restaurant disponible');
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });
    if (produit.disponible === false) {
      return res.status(400).json({ message: 'Ce produit n’accepte pas d’avis pour le moment' });
    }

    const com = commentaire != null ? String(commentaire).trim().slice(0, 2000) : '';

    let updated = false;
    let avis = await AvisProduit.findOne({ produit: produitId, client: req.user._id });
    if (avis) {
      updated = true;
      avis.note = n;
      avis.commentaire = com;
      await avis.save();
    } else {
      avis = await AvisProduit.create({
        produit: produitId,
        restaurant: produit.restaurant,
        client: req.user._id,
        note: n,
        commentaire: com
      });
    }

    const populated = await AvisProduit.findById(avis._id)
      .populate('client', 'nom')
      .lean();

    const all = await AvisProduit.find({ produit: produitId }).lean();
    res.status(updated ? 200 : 201).json({
      avis: {
        _id: populated._id,
        note: populated.note,
        commentaire: populated.commentaire || '',
        createdAt: populated.createdAt,
        auteur: populated.client?.nom ? String(populated.client.nom).trim() || 'Client' : 'Client'
      },
      stats: computeStats(all)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Avis déjà enregistré pour ce produit' });
    }
    res.status(500).json({ message: error.message });
  }
});

/** Tous les avis des produits d’une entreprise (dashboard) */
router.get('/dashboard/:restaurantId', auth, isRestaurant, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId requis' });
    const ok = await canManageRestaurant(req.user._id, restaurantId);
    if (!ok) return res.status(403).json({ message: 'Accès refusé' });

    const list = await AvisProduit.find({ restaurant: restaurantId })
      .populate('client', 'nom email')
      .populate('produit', 'nom nomEn')
      .sort({ createdAt: -1 })
      .lean();

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Supprimer un avis (modération) */
router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const avis = await AvisProduit.findById(req.params.id);
    if (!avis) return res.status(404).json({ message: 'Avis non trouvé' });

    const ok = await canManageRestaurant(req.user._id, avis.restaurant);
    if (!ok) return res.status(403).json({ message: 'Accès refusé' });

    await AvisProduit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Avis supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
