/**
 * Aligne le catalogue King Fish (noms, tailles, prix) dans MongoDB.
 * Les prix sont ceux affichés : la taille de base est basePrice, le reste est un supplément.
 */
const MealProduct = require('../models/MealProduct');
const MealShopSettings = require('../models/MealShopSettings');

const IMG = '/images/repas/refonte/machoiron-frit-photo.webp';

function taille(choices) {
  return {
    name: 'Taille',
    selectionType: 'single',
    required: true,
    choices: choices.map(([label, price]) => ({
      label,
      price,
      available: true,
    })),
  };
}

const PRICE_PATCHES = [
  {
    slug: 'tilapia-braise',
    name: 'Tilapia braisé',
    basePrice: 3500,
    optionGroups: [taille([['Moyen', 0], ['Grand', 1500]])],
  },
  {
    slug: 'monyo-tilapia-frite',
    name: 'Monyo de tilapia frit',
    shortDescription: 'Tilapia frit croustillant, portion généreuse, servi avec son monyo.',
    basePrice: 1500,
    optionGroups: [taille([['Petit', 0], ['Moyen', 500], ['Grand', 1000]])],
  },
  {
    slug: 'machoiron-braise',
    name: 'Machoiron braisé',
    shortDescription: 'Machoiron braisé entier et légumes.',
    basePrice: 2500,
    optionGroups: [taille([['Moyen', 0], ['Grand', 500]])],
  },
];

const NAME_FIXES = {
  shawarma: { name: 'Chawarma', shortDescription: 'Wrap généreux au poisson, sauce crémeuse et légumes croquants.' },
  'filet-poisson-pouiller': { name: 'Filet de poisson poêlé', shortDescription: 'Filet poêlé, croustillant dehors et fondant dedans.' },
  'brochette-de-poisson': {
    name: 'Brochette de poisson',
    shortDescription: 'Brochette de poisson marinée au feu, idéale avec frites ou attiéké.',
  },
  'monyo-machoiron-fume': {
    name: 'Monyo de machoiron fumé',
    shortDescription: "Machoiron fumé à l'ancienne aux saveurs intenses.",
  },
  'rillettes-de-poissons': {
    name: 'Rillettes de poisson',
    shortDescription: 'Pot de rillettes de poisson KING FISH, saveur authentique.',
  },
  'salade-king-fish': {
    name: 'Salade King Fish',
    shortDescription: 'Salade fraîche, poisson fumé, tomate, carotte, œufs, concombre et sauce maison.',
  },
};

async function ensureKingFishCatalogue() {
  for (const patch of PRICE_PATCHES) {
    const doc = await MealProduct.findOne({ slug: patch.slug });
    if (!doc) continue;
    doc.name = patch.name;
    doc.basePrice = patch.basePrice;
    if (patch.shortDescription) doc.shortDescription = patch.shortDescription;
    doc.optionGroups = patch.optionGroups;
    doc.published = true;
    await doc.save();
  }

  for (const [slug, patch] of Object.entries(NAME_FIXES)) {
    const doc = await MealProduct.findOne({ slug });
    if (!doc) continue;
    doc.name = patch.name;
    if (patch.shortDescription) doc.shortDescription = patch.shortDescription;
    await doc.save();
  }

  let fried = await MealProduct.findOne({ slug: 'monyo-machoiron-frit' });
  const smoked = await MealProduct.findOne({ slug: 'monyo-machoiron-fume' });
  const sides = smoked?.accompagnements?.length
    ? smoked.accompagnements.map((a) => ({
        name: a.name,
        price: a.price,
        required: false,
        available: a.available !== false,
        maxQuantity: a.maxQuantity || 5,
      }))
    : [];

  if (!fried) {
    fried = new MealProduct({
      slug: 'monyo-machoiron-frit',
      name: 'Monyo de machoiron frit',
      category: 'Poissons',
      basePrice: 1500,
      shortDescription: 'Machoiron frit, monyo tomate-oignon et sauce maison.',
      mainImage: IMG,
      images: [IMG],
      accompagnements: sides,
      optionGroups: [taille([['Moyen', 0], ['Grand', 500]])],
      published: true,
      available: true,
      showDeliveryNotice: true,
      allowSpecifications: true,
      sortOrder: 65,
      currency: 'XOF',
    });
  } else {
    fried.name = 'Monyo de machoiron frit';
    fried.basePrice = 1500;
    fried.shortDescription = 'Machoiron frit, monyo tomate-oignon et sauce maison.';
    fried.mainImage = IMG;
    fried.images = [IMG];
    fried.optionGroups = [taille([['Moyen', 0], ['Grand', 500]])];
    fried.published = true;
    fried.available = true;
    fried.category = fried.category || 'Poissons';
    if (!fried.accompagnements?.length && sides.length) fried.accompagnements = sides;
  }
  await fried.save();

  const settings = await MealShopSettings.findOne({ key: 'default' });
  if (settings) {
    const slides = Array.isArray(settings.heroSlides) ? settings.heroSlides : [];
    const hasSlide = slides.some((s) => String(s.productSlug || '') === 'monyo-machoiron-frit');
    if (!hasSlide) {
      settings.heroSlides = [
        ...slides.map((s) => (s.toObject ? s.toObject() : { ...s })),
        {
          productSlug: 'monyo-machoiron-frit',
          active: true,
          imageUrl: '',
          imageUrls: [],
          title: 'Monyo de machoiron frit',
          subtitle: 'Machoiron frit, monyo tomate-oignon et sauce maison.',
          ctaLabel: 'Commander',
          ctaHref: '#menu',
        },
      ];
      await settings.save();
    }
  }

  console.log('🍽️ Catalogue King Fish aligné (tailles et prix)');
}

module.exports = { ensureKingFishCatalogue };
