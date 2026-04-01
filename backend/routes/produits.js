const express = require('express');
const mongoose = require('mongoose');
const Produit = require('../models/Produit');
const Restaurant = require('../models/Restaurant');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadProduit');
const uploadProductFields = upload.uploadProductFields;

const router = express.Router();
const { parsePromoPourcentageBody, parsePromoLivraisonBody } = require('../utils/productPromo');

function parseCaracteristiques(input) {
  if (input === undefined) return undefined;
  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean);
  }
  const str = String(input ?? '').trim();
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch (_) {
    /* ignore */
  }
  return str.split(/\n/).map((s) => s.trim()).filter(Boolean);
}

function isAllowedUploadRef(p) {
  const s = String(p || '').trim();
  return ((s.startsWith('/uploads/') || (s.startsWith('http') && s.includes('cloudinary.com'))) && !s.includes('..'));
}

// Liste pour un restaurant (public)
router.get('/', async (req, res) => {
  try {
    const { restaurantId, categorieProduitId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId requis' });
    }
    const query = { restaurant: restaurantId, disponible: true };
    if (categorieProduitId) query.categorieProduit = categorieProduitId;
    const list = await Produit.find(query)
      .populate('categorieProduit', 'nom nomEn image')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Tous les produits d’une entreprise (dashboard : y compris indisponibles) */
router.get('/dashboard/:restaurantId', auth, isRestaurant, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    if (!restaurantId) return res.status(400).json({ message: 'restaurantId requis' });
    const ok = await canManageRestaurant(req.user._id, restaurantId);
    if (!ok) return res.status(403).json({ message: 'Accès refusé' });
    const list = await Produit.find({ restaurant: restaurantId })
      .populate('categorieProduit', 'nom nomEn image')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function normalizeSearchText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Recherche globale de produits (accueil) : mots dans nom / description / nom d’accueil */
router.get('/search', async (req, res) => {
  try {
    const qRaw = String(req.query.q || '').trim();
    if (qRaw.length < 2) return res.json([]);

    const words = qRaw
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\wÀ-ÿ'-]+/gi, ''))
      .filter((w) => w.length >= 1)
      .map((w) => normalizeSearchText(w));

    if (words.length === 0) return res.json([]);

    const restaurantQuery = { actif: { $ne: false } };
    const catId = req.query.categorieId;
    if (catId && mongoose.Types.ObjectId.isValid(catId)) {
      restaurantQuery.$or = [
        { categoriesDomaine: catId },
        { categorie: catId },
      ];
    }

    const activeRestoIds = await Restaurant.find(restaurantQuery).distinct('_id');
    if (!activeRestoIds.length) return res.json([]);

    const produits = await Produit.find({
      restaurant: { $in: activeRestoIds },
      disponible: { $ne: false },
    })
      .populate('restaurant', 'nom nomEn logo position')
      .populate('categorieProduit', 'nom nomEn image')
      .sort({ createdAt: -1 })
      .limit(800)
      .lean();

    const scored = [];
    for (const p of produits) {
      const carJoin = []
        .concat(p.caracteristiques || [], p.caracteristiquesEn || [])
        .filter(Boolean)
        .join(' ');
      const parts = [p.nom, p.nomEn, p.description, p.descriptionEn, p.nomAfficheAccueil, p.nomAfficheAccueilEn, carJoin]
        .filter(Boolean)
        .map((s) => normalizeSearchText(s));
      const hayJoined = parts.join(' ');
      let score = 0;
      for (const w of words) {
        if (!w) continue;
        if (hayJoined.includes(w)) {
          score += 3;
          continue;
        }
        const tokens = hayJoined.split(/\s+/).filter(Boolean);
        const partial = tokens.some(
          (t) => (t.length >= 2 && (t.includes(w) || w.includes(t))) || t === w
        );
        if (partial) score += 1;
      }
      if (score > 0) scored.push({ p, score });
    }

    scored.sort((a, b) => b.score - a.score || String(a.p.nom).localeCompare(String(b.p.nom)));
    let results = scored.map((x) => x.p).slice(0, 50);

    const lat = parseFloat(req.query.latitude);
    const lng = parseFloat(req.query.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      results = results.map((p) => {
        const r = p.restaurant;
        let distanceKm = null;
        if (r?.position?.latitude != null && r?.position?.longitude != null) {
          distanceKm = haversineKm(lat, lng, r.position.latitude, r.position.longitude);
        }
        return { ...p, distanceKm };
      });
      results.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mise à jour visuels / nom accueil (JSON — sélection depuis médiathèque)
router.patch('/:id/visuels', auth, isRestaurant, async (req, res) => {
  try {
    const prod = await Produit.findById(req.params.id);
    if (!prod) return res.status(404).json({ message: 'Produit non trouvé' });

    const restaurant = await Restaurant.findById(prod.restaurant);
    if (!restaurant || (restaurant.proprietaire.toString() !== req.user._id.toString() &&
        !(restaurant.gestionnaires || []).some((g) => g.toString() === req.user._id.toString()))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { imageCarteHome, banniereProduit, nomAfficheAccueil, nomAfficheAccueilEn } = req.body;

    if (imageCarteHome !== undefined) {
      prod.imageCarteHome = imageCarteHome && String(imageCarteHome).trim()
        ? String(imageCarteHome).trim()
        : null;
    }
    if (banniereProduit !== undefined) {
      prod.banniereProduit = banniereProduit && String(banniereProduit).trim()
        ? String(banniereProduit).trim()
        : null;
    }
    if (nomAfficheAccueil !== undefined) {
      prod.nomAfficheAccueil = nomAfficheAccueil && String(nomAfficheAccueil).trim()
        ? String(nomAfficheAccueil).trim()
        : null;
    }
    if (nomAfficheAccueilEn !== undefined) {
      prod.nomAfficheAccueilEn = nomAfficheAccueilEn && String(nomAfficheAccueilEn).trim()
        ? String(nomAfficheAccueilEn).trim()
        : null;
    }

    await prod.save();
    await prod.populate('categorieProduit', 'nom nomEn image');
    res.json(prod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Détail
router.get('/:id', async (req, res) => {
  try {
    const p = await Produit.findById(req.params.id).populate('categorieProduit', 'nom nomEn image').populate('restaurant', 'nom nomEn logo');
    if (!p) return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(p);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vérifier que l'utilisateur peut gérer ce restaurant
async function canManageRestaurant(userId, restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) return false;
  if (restaurant.proprietaire.toString() === userId.toString()) return true;
  return (restaurant.gestionnaires || []).some(g => g.toString() === userId.toString());
}

// Créer (dashboard) — restaurantId dans le body pour choisir l'entreprise
router.post('/', auth, isRestaurant, upload.fields(uploadProductFields), async (req, res) => {
  try {
    let restaurantId = req.body.restaurantId;
    if (!restaurantId) {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);
      restaurantId = user.restaurantId?._id || user.restaurantId;
    }
    if (!restaurantId) {
      return res.status(400).json({ message: 'Aucune structure associée. Sélectionnez une entreprise ou créez-en une.' });
    }
    const allowed = await canManageRestaurant(req.user._id, restaurantId);
    if (!allowed) {
      return res.status(403).json({ message: 'Accès refusé pour cette entreprise' });
    }

    const { nom, nomEn, description, descriptionEn, prix, categorieProduitId, nomAfficheAccueil, nomAfficheAccueilEn, caracteristiques, caracteristiquesEn, promoLivraisonGratuite, promoPourcentage } = req.body;
    if (!nom || !nom.trim()) return res.status(400).json({ message: 'Le nom est requis' });
    if (prix === undefined || prix === null || isNaN(parseFloat(prix))) {
      return res.status(400).json({ message: 'Le prix (FCFA) est requis' });
    }

    const files = req.files || {};
    const mainFile = files.image && files.image[0];
    const carteFile = files.imageCarteHome && files.imageCarteHome[0];
    const banniereFile = files.banniereProduit && files.banniereProduit[0];

    const data = {
      nom: nom.trim(),
      nomEn: nomEn != null ? String(nomEn).trim() : '',
      description: (description && description.trim()) || '',
      descriptionEn: descriptionEn != null ? String(descriptionEn).trim() : '',
      prix: parseFloat(prix),
      restaurant: restaurantId,
      disponible: true,
      caracteristiques: parseCaracteristiques(caracteristiques) ?? [],
      caracteristiquesEn: parseCaracteristiques(caracteristiquesEn) ?? [],
    };
    if (categorieProduitId) data.categorieProduit = categorieProduitId;
    if (nomAfficheAccueil && String(nomAfficheAccueil).trim()) {
      data.nomAfficheAccueil = String(nomAfficheAccueil).trim();
    }
    if (nomAfficheAccueilEn !== undefined) {
      const v = nomAfficheAccueilEn && String(nomAfficheAccueilEn).trim();
      data.nomAfficheAccueilEn = v || null;
    }
    if (mainFile) {
      data.images = [mainFile.path];
    } else if (req.body.galleryImagePath && isAllowedUploadRef(req.body.galleryImagePath)) {
      data.images = [String(req.body.galleryImagePath).trim()];
    }
    if (carteFile) {
      data.imageCarteHome = carteFile.path;
    }
    if (banniereFile) {
      data.banniereProduit = banniereFile.path;
    }
    if (!carteFile && req.body.imageCarteHome && isAllowedUploadRef(req.body.imageCarteHome)) {
      data.imageCarteHome = String(req.body.imageCarteHome).trim();
    }
    if (!banniereFile && req.body.banniereProduit && isAllowedUploadRef(req.body.banniereProduit)) {
      data.banniereProduit = String(req.body.banniereProduit).trim();
    }
    data.promoLivraisonGratuite = parsePromoLivraisonBody(promoLivraisonGratuite);
    data.promoPourcentage = parsePromoPourcentageBody(promoPourcentage);
    if (req.body.recommande !== undefined) {
      const r = req.body.recommande;
      data.recommande = r === true || r === 'true' || r === '1';
    }
    const prod = new Produit(data);
    await prod.save();
    await prod.populate('categorieProduit', 'nom nomEn image');
    res.status(201).json(prod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mettre à jour
router.put('/:id', auth, isRestaurant, upload.fields(uploadProductFields), async (req, res) => {
  try {
    const prod = await Produit.findById(req.params.id);
    if (!prod) return res.status(404).json({ message: 'Produit non trouvé' });

    const restaurant = await Restaurant.findById(prod.restaurant);
    if (!restaurant || (restaurant.proprietaire.toString() !== req.user._id.toString() &&
        !(restaurant.gestionnaires || []).some(g => g.toString() === req.user._id.toString()))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const files = req.files || {};
    const mainFile = files.image && files.image[0];
    const carteFile = files.imageCarteHome && files.imageCarteHome[0];
    const banniereFile = files.banniereProduit && files.banniereProduit[0];

    if (req.body.nom) prod.nom = req.body.nom.trim();
    if (req.body.nomEn !== undefined) prod.nomEn = String(req.body.nomEn || '').trim();
    if (req.body.nomAfficheAccueil !== undefined) {
      const v = req.body.nomAfficheAccueil;
      prod.nomAfficheAccueil = v && String(v).trim() ? String(v).trim() : null;
    }
    if (req.body.nomAfficheAccueilEn !== undefined) {
      const v = req.body.nomAfficheAccueilEn;
      prod.nomAfficheAccueilEn = v && String(v).trim() ? String(v).trim() : null;
    }
    if (req.body.description !== undefined) prod.description = req.body.description.trim();
    if (req.body.descriptionEn !== undefined) prod.descriptionEn = String(req.body.descriptionEn || '').trim();
    if (req.body.prix !== undefined) prod.prix = parseFloat(req.body.prix);
    if (req.body.categorieProduitId !== undefined) prod.categorieProduit = req.body.categorieProduitId || null;
    if (req.body.disponible !== undefined) {
      const d = req.body.disponible;
      prod.disponible = d === true || d === 'true' || d === '1';
    }
    if (req.body.promoLivraisonGratuite !== undefined) {
      prod.promoLivraisonGratuite = parsePromoLivraisonBody(req.body.promoLivraisonGratuite);
    }
    if (req.body.promoPourcentage !== undefined) {
      prod.promoPourcentage = parsePromoPourcentageBody(req.body.promoPourcentage);
    }
    if (req.body.recommande !== undefined) {
      const r = req.body.recommande;
      prod.recommande = r === true || r === 'true' || r === '1';
    }
    if (req.body.caracteristiques !== undefined) {
      prod.caracteristiques = parseCaracteristiques(req.body.caracteristiques) || [];
    }
    if (req.body.caracteristiquesEn !== undefined) {
      prod.caracteristiquesEn = parseCaracteristiques(req.body.caracteristiquesEn) || [];
    }
    if (mainFile) {
      const newImg = mainFile.path;
      prod.images = Array.isArray(prod.images) && prod.images.length
        ? [...prod.images, newImg]
        : [newImg];
    } else if (req.body.galleryImagePath && isAllowedUploadRef(req.body.galleryImagePath)) {
      const gp = String(req.body.galleryImagePath).trim();
      prod.images = Array.isArray(prod.images) && prod.images.length ? [...prod.images, gp] : [gp];
    }
    if (carteFile) {
      prod.imageCarteHome = carteFile.path;
    }
    if (banniereFile) {
      prod.banniereProduit = banniereFile.path;
    }
    // Chemins issus de la médiathèque (multipart texte) si pas de nouveau fichier
    if (!carteFile && req.body.imageCarteHome !== undefined) {
      const t = req.body.imageCarteHome == null ? '' : String(req.body.imageCarteHome).trim();
      if (t === '') prod.imageCarteHome = null;
      else if (isAllowedUploadRef(t)) prod.imageCarteHome = t;
    }
    if (!banniereFile && req.body.banniereProduit !== undefined) {
      const t = req.body.banniereProduit == null ? '' : String(req.body.banniereProduit).trim();
      if (t === '') prod.banniereProduit = null;
      else if (isAllowedUploadRef(t)) prod.banniereProduit = t;
    }
    await prod.save();
    await prod.populate('categorieProduit', 'nom nomEn image');
    res.json(prod);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Supprimer
router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const prod = await Produit.findById(req.params.id);
    if (!prod) return res.status(404).json({ message: 'Produit non trouvé' });
    const restaurant = await Restaurant.findById(prod.restaurant);
    if (!restaurant || (restaurant.proprietaire.toString() !== req.user._id.toString() &&
        !(restaurant.gestionnaires || []).some(g => g.toString() === req.user._id.toString()))) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    await Produit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
