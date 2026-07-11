const express = require('express');
const MealProduct = require('../models/MealProduct');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadMealProduct');
const { uniqueSlug } = require('../utils/slugify');
const { normalizeAccompagnements, serializeMealProduct } = require('../utils/mealPricing');
const { normalizeCopySections } = require('../utils/normalizeShopCopySections');

const router = express.Router();

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildPromoFromBody(body) {
  const promo = parseJsonField(body.promo, {});
  const priceMode = promo.priceMode === 'manual' ? 'manual' : 'percent';
  const manualRaw = promo.manualPrice;
  const manualPrice =
    manualRaw === '' || manualRaw == null || manualRaw === undefined
      ? null
      : Math.max(0, Number(manualRaw));
  return {
    active: promo.active === true || promo.active === 'true',
    priceMode,
    discountPercent: Math.min(100, Math.max(0, Number(promo.discountPercent || 0))),
    manualPrice: Number.isFinite(manualPrice) ? manualPrice : null,
    freeDelivery: promo.freeDelivery === true || promo.freeDelivery === 'true',
    startsAt: promo.startsAt ? new Date(promo.startsAt) : null,
    endsAt: promo.endsAt ? new Date(promo.endsAt) : null,
    runUntilStopped: promo.runUntilStopped !== false && promo.runUntilStopped !== 'false',
  };
}

function collectUploadedImages(req) {
  const paths = [];
  if (req.files?.mainImage?.[0]?.path) paths.push(req.files.mainImage[0].path);
  if (Array.isArray(req.files)) {
    for (const f of req.files) {
      if (f.path) paths.push(f.path);
    }
  } else if (req.files?.images) {
    for (const f of req.files.images) {
      if (f.path) paths.push(f.path);
    }
  }
  return paths;
}

// ——— Public ———

router.get('/public', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const products = await MealProduct.find({ published: true }).sort({ sortOrder: 1, createdAt: -1 });
    res.json(products.map((p) => serializeMealProduct(p)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/public/:slug', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const product = await MealProduct.findOne({ slug: req.params.slug.toLowerCase(), published: true });
    if (!product) return res.status(404).json({ message: 'Plat introuvable' });
    res.json(serializeMealProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ——— Dashboard ———

router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    const products = await MealProduct.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(products.map((p) => serializeMealProduct(p)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upload', auth, isRestaurant, upload.array('images', 8), async (req, res) => {
  try {
    const urls = (req.files || []).map((f) => f.path).filter(Boolean);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const product = await MealProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Plat introuvable' });
    res.json(serializeMealProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, isRestaurant, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 8 },
]), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Le nom est requis' });
    const basePrice = Number(req.body.basePrice);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({ message: 'Prix invalide' });
    }

    const uploaded = collectUploadedImages(req);
    const existingImages = parseJsonField(req.body.images, []);
    const images = [...(Array.isArray(existingImages) ? existingImages : []), ...uploaded].filter(Boolean);
    const mainImage = req.files?.mainImage?.[0]?.path || req.body.mainImage || images[0] || null;

    const slug = await uniqueSlug(MealProduct, req.body.slug || name);
    const product = new MealProduct({
      name,
      slug,
      shortDescription: String(req.body.shortDescription || ''),
      copySections: normalizeCopySections(parseJsonField(req.body.copySections, [])),
      images,
      mainImage,
      basePrice: Math.round(basePrice),
      deliveryFee: Math.max(0, Math.round(Number(req.body.deliveryFee) || 0)),
      category: String(req.body.category || '').trim(),
      published: req.body.published === true || req.body.published === 'true',
      sortOrder: Number(req.body.sortOrder) || 0,
      accompagnements: normalizeAccompagnements(parseJsonField(req.body.accompagnements, [])),
      promo: buildPromoFromBody(req.body),
    });
    await product.save();
    res.status(201).json(serializeMealProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, isRestaurant, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'images', maxCount: 8 },
]), async (req, res) => {
  try {
    const product = await MealProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Plat introuvable' });

    if (req.body.name != null) product.name = String(req.body.name).trim();
    if (req.body.shortDescription != null) product.shortDescription = String(req.body.shortDescription);
    if (req.body.copySections != null) {
      product.copySections = normalizeCopySections(parseJsonField(req.body.copySections, []));
    }
    if (req.body.basePrice != null) {
      const basePrice = Number(req.body.basePrice);
      if (!Number.isFinite(basePrice) || basePrice < 0) {
        return res.status(400).json({ message: 'Prix invalide' });
      }
      product.basePrice = Math.round(basePrice);
    }
    if (req.body.deliveryFee != null) {
      product.deliveryFee = Math.max(0, Math.round(Number(req.body.deliveryFee) || 0));
    }
    if (req.body.category != null) product.category = String(req.body.category).trim();
    if (req.body.published != null) {
      product.published = req.body.published === true || req.body.published === 'true';
    }
    if (req.body.sortOrder != null) product.sortOrder = Number(req.body.sortOrder) || 0;
    if (req.body.accompagnements != null) {
      product.accompagnements = normalizeAccompagnements(parseJsonField(req.body.accompagnements, []));
    }
    if (req.body.promo != null) product.promo = buildPromoFromBody(req.body);

    const uploaded = collectUploadedImages(req);
    if (req.body.images != null || uploaded.length) {
      const existingImages = parseJsonField(req.body.images, product.images || []);
      product.images = [...(Array.isArray(existingImages) ? existingImages : []), ...uploaded].filter(Boolean);
    }
    if (req.files?.mainImage?.[0]?.path) {
      product.mainImage = req.files.mainImage[0].path;
    } else if (req.body.mainImage != null) {
      product.mainImage = req.body.mainImage || product.images[0] || null;
    }

    if (req.body.slug) {
      product.slug = await uniqueSlug(MealProduct, req.body.slug, product._id);
    }

    await product.save();
    res.json(serializeMealProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/promo', auth, isRestaurant, async (req, res) => {
  try {
    const product = await MealProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Plat introuvable' });
    if (req.body.promo) product.promo = { ...product.promo.toObject?.() || product.promo, ...buildPromoFromBody(req.body) };
    if (req.body.published != null) {
      product.published = req.body.published === true || req.body.published === 'true';
    }
    if (req.body.active != null) {
      product.promo.active = req.body.active === true || req.body.active === 'true';
    }
    await product.save();
    res.json(serializeMealProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const product = await MealProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Plat introuvable' });
    res.json({ message: 'Plat supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
