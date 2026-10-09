/**
 * Seed catalogue King Fish / Shop Repas (plats + accompagnements + images).
 * Usage : node backend/scripts/seedKingFishMeals.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const MealProduct = require('../models/MealProduct');
const MealShopSettings = require('../models/MealShopSettings');

const IMG = '/images/repas/refonte';

const SIDES = [
  { name: 'Riz', price: 500 },
  { name: 'Légumes sautés', price: 500 },
  { name: 'Akassa', price: 500 },
  { name: 'Attiéké', price: 500 },
  { name: 'Aloko', price: 500 },
  { name: 'Banane bouillie', price: 500 },
  { name: 'Spaghetti', price: 500 },
  { name: 'Wassa wassa', price: 500 },
  { name: 'Frites', price: 1000 },
].map((a) => ({ ...a, required: false, available: true, maxQuantity: 5 }));

const FISH_SIDES = SIDES;

const PRODUCTS = [
  {
    slug: 'shawarma',
    name: 'Chawarma',
    category: 'Street food',
    basePrice: 2000,
    shortDescription: 'Wrap généreux au poisson, sauce crémeuse et légumes croquants.',
    mainImage: `${IMG}/shawarma-2.jpg`,
    images: [`${IMG}/shawarma-2.jpg`, `${IMG}/shawarma.jpg`],
    accompagnements: [],
    sortOrder: 10,
  },
  {
    slug: 'poisson-pane',
    name: 'Poisson pané',
    category: 'Poissons',
    basePrice: 1500,
    shortDescription: 'Filets croustillants dorés, servis avec une touche de fraîcheur.',
    mainImage: `${IMG}/poisson-pane.jpg`,
    images: [`${IMG}/poisson-pane.jpg`],
    accompagnements: FISH_SIDES,
    sortOrder: 20,
  },
  {
    slug: 'filet-poisson-pouiller',
    name: 'Filet de poisson poêlé',
    category: 'Poissons',
    basePrice: 1500,
    shortDescription: 'Filet poêlé, croustillant dehors et fondant dedans.',
    mainImage: `${IMG}/filet-poele.jpg`,
    images: [`${IMG}/filet-poele.jpg`],
    accompagnements: FISH_SIDES,
    sortOrder: 30,
  },
  {
    slug: 'brochette-de-poisson',
    name: 'Brochette de poisson',
    category: 'Poissons',
    basePrice: 1500,
    shortDescription: 'Brochette de poisson marinée au feu, idéale avec frites ou attiéké.',
    mainImage: `${IMG}/brochette-photo.webp`,
    images: [`${IMG}/brochette-photo.webp`],
    accompagnements: FISH_SIDES,
    sortOrder: 40,
  },
  {
    slug: 'monyo-machoiron-fume',
    name: 'Monyo de machoiron fumé',
    category: 'Poissons',
    basePrice: 1500,
    shortDescription: 'Machoiron fumé, monyo tomate-oignon, riz et sauce maison.',
    mainImage: `${IMG}/machoiron-fume-photo.webp`,
    images: [`${IMG}/machoiron-fume-photo.webp`],
    accompagnements: FISH_SIDES,
    sortOrder: 50,
  },
  {
    slug: 'monyo-tilapia-frite',
    name: 'Monyo de tilapia frit',
    category: 'Poissons',
    basePrice: 1500,
    shortDescription: 'Tilapia frit croustillant, portion généreuse, servi avec son monyo.',
    mainImage: `${IMG}/tilapia-frite-photo.webp`,
    images: [`${IMG}/tilapia-frite-photo.webp`],
    accompagnements: FISH_SIDES,
    sortOrder: 60,
  },
  {
    slug: 'tilapia-braise',
    name: 'Tilapia braisé',
    category: 'Poissons',
    basePrice: 3000,
    shortDescription: 'Tilapia entier braisé, carottes et haricots verts sautés.',
    mainImage: `${IMG}/tilapia-braise.jpg`,
    images: [`${IMG}/tilapia-braise.jpg`],
    accompagnements: FISH_SIDES,
    optionGroups: [
      {
        name: 'Taille',
        selectionType: 'single',
        required: true,
        choices: [
          { label: 'Moyen', price: 0 },
          { label: 'Grand', price: 2000 },
        ],
      },
    ],
    sortOrder: 70,
  },
  {
    slug: 'machoiron-braise',
    name: 'Machoiron braisé',
    category: 'Poissons',
    basePrice: 2000,
    shortDescription: 'Machoiron braisé entier et légumes.',
    mainImage: `${IMG}/machoiron-braise.jpg`,
    images: [`${IMG}/machoiron-braise.jpg`, `${IMG}/machoiron-braise-food.jpg`],
    accompagnements: FISH_SIDES,
    optionGroups: [
      {
        name: 'Taille',
        selectionType: 'single',
        required: true,
        choices: [
          { label: 'Petit', price: 0 },
          { label: 'Moyen', price: 1000 },
          { label: 'Grand', price: 3000 },
        ],
      },
    ],
    sortOrder: 80,
  },
  {
    slug: 'omelette',
    name: 'Omelette',
    category: 'Petit déjeuner',
    basePrice: 500,
    shortDescription: 'Omelette maison, simple et rapide.',
    mainImage: `${IMG}/omelette-cut.webp`,
    images: [`${IMG}/omelette-cut.webp`],
    accompagnements: [
      { name: 'Légumes sautés', price: 500, required: false, available: true, maxQuantity: 3 },
      { name: 'Riz', price: 500, required: false, available: true, maxQuantity: 3 },
      { name: 'Frites', price: 1000, required: false, available: true, maxQuantity: 3 },
    ],
    sortOrder: 90,
  },
  {
    slug: 'rillettes-de-poissons',
    name: 'Rillettes de poisson',
    category: 'Gourmet',
    basePrice: 2500,
    shortDescription: 'Pot King Fish — rillettes de poissons, saveur authentique.',
    mainImage: `${IMG}/rillettes.jpg`,
    images: [`${IMG}/rillettes.jpg`],
    accompagnements: [],
    sortOrder: 100,
  },
  {
    slug: 'salade-king-fish',
    name: 'Salade King Fish',
    category: 'Salades',
    basePrice: 1500,
    shortDescription:
      'Salade fraîche, poisson fumé, tomate, carotte, œufs, concombre et sauce maison.',
    mainImage: `${IMG}/salade-2.jpg`,
    images: [`${IMG}/salade-2.jpg`, `${IMG}/salade.jpg`],
    accompagnements: [],
    sortOrder: 110,
  },
  {
    slug: 'chips-de-poisson-spicy',
    name: 'Chips de poisson Spicy',
    category: 'Snacks',
    basePrice: 1000,
    shortDescription: 'Chips de poisson King Fish — édition Spicy 100 g.',
    mainImage: `${IMG}/chips-spicy.jpg`,
    images: [`${IMG}/chips-spicy.jpg`],
    accompagnements: [],
    sortOrder: 120,
  },
  {
    slug: 'chips-de-poisson-nature',
    name: 'Chips de poisson Nature',
    category: 'Snacks',
    basePrice: 1000,
    shortDescription: 'Chips de poisson King Fish — édition Nature 100 g.',
    mainImage: `${IMG}/chips-nature.jpg`,
    images: [`${IMG}/chips-nature.jpg`],
    accompagnements: [],
    sortOrder: 130,
  },
];

async function upsertProduct(def) {
  const payload = {
    name: def.name,
    slug: def.slug,
    shortDescription: def.shortDescription,
    category: def.category,
    basePrice: def.basePrice,
    mainImage: def.mainImage,
    images: def.images || [],
    accompagnements: def.accompagnements || [],
    optionGroups: def.optionGroups || [],
    published: true,
    available: true,
    showDeliveryNotice: true,
    allowSpecifications: true,
    sortOrder: def.sortOrder,
    currency: 'XOF',
  };

  const existing = await MealProduct.findOne({ slug: def.slug });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return { slug: def.slug, action: 'updated' };
  }
  await MealProduct.create(payload);
  return { slug: def.slug, action: 'created' };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapido_flash';
  await mongoose.connect(mongoUri);
  console.log('📊 MongoDB connecté');

  for (const p of PRODUCTS) {
    const r = await upsertProduct(p);
    console.log(`  ${r.action}: ${r.slug} — ${p.name} (${p.basePrice} F)`);
  }

  const categories = [
    'Street food',
    'Poissons',
    'Salades',
    'Gourmet',
    'Snacks',
    'Petit déjeuner',
  ];

  let settings = await MealShopSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = new MealShopSettings({ key: 'default' });
  }
  settings.categories = categories;
  settings.deliveryFee = settings.deliveryFee || 500;
  const defaultBanners = [
    'tilapia-braise',
    'shawarma',
    'brochette-de-poisson',
    'poisson-pane',
    'monyo-machoiron-fume',
    'salade-king-fish',
    'filet-poisson-pouiller',
    'monyo-tilapia-frite',
    'machoiron-braise',
    'rillettes-de-poissons',
  ];
  const slidesRaw = settings.heroSlides || [];
  const needsBannerUpgrade =
    !slidesRaw.length || slidesRaw.every((s) => !String(s.productSlug || '').trim());
  if (needsBannerUpgrade) {
    settings.heroSlides = defaultBanners.map((slug) => {
      const p = PRODUCTS.find((x) => x.slug === slug);
      return {
        productSlug: slug,
        active: true,
        imageUrl: '',
        imageUrls: [],
        title: p?.name || '',
        subtitle: p?.shortDescription || '',
        ctaLabel: 'Commander',
        ctaHref: '#menu',
      };
    });
  } else {
    settings.heroSlides = slidesRaw.map((s) => {
      const plain = s.toObject ? s.toObject() : { ...s };
      return {
        ...plain,
        active: plain.active !== false,
        productSlug: String(plain.productSlug || '').trim(),
      };
    });
  }
  if (!settings.trustItems?.length) {
    settings.trustItems = [
      { title: 'Livraison rapide', subtitle: 'Cotonou & Calavi' },
      { title: 'Paiement à la livraison', subtitle: 'Payez à la réception' },
      { title: 'Fait maison', subtitle: 'Préparé à la commande' },
      { title: 'WhatsApp', subtitle: 'Suivi de commande' },
    ];
  }
  await settings.save();
  console.log('✅ Settings boutique mis à jour');

  const count = await MealProduct.countDocuments({ published: true });
  console.log(`🍽  ${count} plats publiés`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
