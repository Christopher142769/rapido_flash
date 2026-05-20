const express = require('express');
const ShopProduct = require('../models/ShopProduct');
const { auth, isRestaurant } = require('../middleware/auth');
const upload = require('../middleware/uploadShopProduct');
const { uniqueSlug } = require('../utils/slugify');
const { serializeShopProduct } = require('../utils/shopPromo');
const { normalizeCopySections, normalizeGalleryImages } = require('../utils/normalizeShopCopySections');
const { normalizeShopQuantityUnit } = require('../utils/shopQuantityUnit');

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

function collectUploadedImages(req) {
  const paths = [];
  if (req.files?.mainImage?.[0]?.path) paths.push(req.files.mainImage[0].path);
  if (req.files?.images) {
    for (const f of req.files.images) {
      if (f.path) paths.push(f.path);
    }
  }
  return paths;
}

function buildPromoFromBody(body) {
  const promo = parseJsonField(body.promo, {});
  return {
    active: promo.active === true || promo.active === 'true',
    discountPercent: Number(promo.discountPercent || 0),
    freeDelivery: promo.freeDelivery === true || promo.freeDelivery === 'true',
    startsAt: promo.startsAt ? new Date(promo.startsAt) : null,
    endsAt: promo.endsAt ? new Date(promo.endsAt) : null,
  };
}

// ——— Public ———

router.get('/public/:slug', async (req, res) => {
  try {
    const product = await ShopProduct.findOne({ slug: req.params.slug.toLowerCase() });
    if (!product) return res.status(404).json({ message: 'Produit introuvable' });
    const data = serializeShopProduct(product, { publicView: true });
    if (!data) return res.status(404).json({ message: 'Produit non publié' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ——— Dashboard (restaurant / gestionnaire) ———

router.get('/', auth, isRestaurant, async (req, res) => {
  try {
    const products = await ShopProduct.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json(products.map((p) => serializeShopProduct(p)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit introuvable' });
    res.json(serializeShopProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, isRestaurant, upload.fields(upload.uploadShopFields), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Nom requis' });
    const basePrice = Number(req.body.basePrice);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({ message: 'Prix invalide' });
    }

    const slug = await uniqueSlug(ShopProduct, req.body.slug || name);
    const uploaded = collectUploadedImages(req);
    const existingImages = parseJsonField(req.body.images, []);
    const images = [...existingImages, ...uploaded].filter(Boolean);
    const mainImage =
      req.files?.mainImage?.[0]?.path ||
      req.body.mainImage ||
      images[0] ||
      null;

    const copySections = normalizeCopySections(parseJsonField(req.body.copySections, []));
    const gallery = normalizeGalleryImages(images, mainImage);

    const product = new ShopProduct({
      name,
      slug,
      shortDescription: req.body.shortDescription || '',
      copySections,
      images: gallery.images,
      mainImage: gallery.mainImage,
      basePrice,
      quantityUnit: normalizeShopQuantityUnit(req.body.quantityUnit),
      currency: req.body.currency || 'XOF',
      published: req.body.published === 'true' || req.body.published === true,
      promo: buildPromoFromBody(req.body),
      whatsappNumber: req.body.whatsappNumber || '',
      contactPhone: req.body.contactPhone || '',
      ctaLabel: req.body.ctaLabel || 'Commander maintenant',
      sortOrder: Number(req.body.sortOrder || 0),
    });

    await product.save();
    res.status(201).json(serializeShopProduct(product));
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Ce slug existe déjà' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, isRestaurant, upload.fields(upload.uploadShopFields), async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit introuvable' });

    if (req.body.name) product.name = String(req.body.name).trim();
    if (req.body.slug) {
      product.slug = await uniqueSlug(ShopProduct, req.body.slug, product._id);
    }
    if (req.body.shortDescription != null) product.shortDescription = req.body.shortDescription;
    if (req.body.copySections != null) {
      product.copySections = normalizeCopySections(parseJsonField(req.body.copySections, []));
    }
    if (req.body.basePrice != null) {
      const basePrice = Number(req.body.basePrice);
      if (!Number.isFinite(basePrice) || basePrice < 0) {
        return res.status(400).json({ message: 'Prix invalide' });
      }
      product.basePrice = basePrice;
    }
    if (req.body.quantityUnit != null) {
      product.quantityUnit = normalizeShopQuantityUnit(req.body.quantityUnit);
    }
    if (req.body.currency) product.currency = req.body.currency;
    if (req.body.published != null) {
      product.published = req.body.published === 'true' || req.body.published === true;
    }
    if (req.body.promo != null) product.promo = buildPromoFromBody(req.body);
    if (req.body.whatsappNumber != null) product.whatsappNumber = req.body.whatsappNumber;
    if (req.body.contactPhone != null) product.contactPhone = req.body.contactPhone;
    if (req.body.ctaLabel != null) product.ctaLabel = req.body.ctaLabel;
    if (req.body.sortOrder != null) product.sortOrder = Number(req.body.sortOrder);

    const uploaded = collectUploadedImages(req);
    let nextImages = product.images || [];
    if (req.body.images != null) {
      const fromBody = parseJsonField(req.body.images, product.images);
      nextImages = [...fromBody, ...uploaded].filter(Boolean);
    } else if (uploaded.length) {
      nextImages = [...nextImages, ...uploaded];
    }

    let nextMain =
      req.files?.mainImage?.[0]?.path ||
      (req.body.mainImage != null ? req.body.mainImage : product.mainImage);
    const gallery = normalizeGalleryImages(nextImages, nextMain);
    product.images = gallery.images;
    product.mainImage = gallery.mainImage;

    await product.save();
    res.json(serializeShopProduct(product));
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Ce slug existe déjà' });
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/promo', auth, isRestaurant, async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit introuvable' });
    product.promo = buildPromoFromBody({ promo: req.body });
    if (req.body.published != null) {
      product.published = !!req.body.published;
    }
    await product.save();
    res.json(serializeShopProduct(product));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, isRestaurant, async (req, res) => {
  try {
    const product = await ShopProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Produit introuvable' });
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
