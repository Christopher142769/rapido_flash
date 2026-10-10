/**
 * Aligne les noms du catalogue King Fish.
 * Les prix et les tailles viennent du dashboard : on ne les réécrit pas
 * sur un plat déjà en base (un redémarrage effacerait les modifications).
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

const NAME_AND_COPY = [
  {
    slug: 'tilapia-braise',
    name: 'Tilapia braisé',
  },
  {
    slug: 'monyo-tilapia-frite',
    name: 'Monyo de tilapia frit',
    shortDescription: 'Tilapia frit croustillant, portion généreuse, servi avec son monyo.',
  },
  {
    slug: 'machoiron-braise',
    name: 'Machoiron braisé',
    shortDescription: 'Machoiron braisé entier et légumes.',
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
  for (const patch of NAME_AND_COPY) {
    const doc = await MealProduct.findOne({ slug: patch.slug });
    if (!doc) continue;
    doc.name = patch.name;
    if (patch.shortDescription) doc.shortDescription = patch.shortDescription;
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
  } else if (!fried.optionGroups?.length) {
    fried.optionGroups = [taille([['Moyen', 0], ['Grand', 500]])];
    if (!fried.basePrice) fried.basePrice = 1500;
    fried.name = fried.name || 'Monyo de machoiron frit';
    fried.published = true;
    fried.available = true;
    if (!fried.accompagnements?.length && sides.length) fried.accompagnements = sides;
  }
  if (fried.isNew || fried.isModified()) await fried.save();

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

  console.log('🍽️ Catalogue King Fish aligné (noms)');
}

module.exports = { ensureKingFishCatalogue };
