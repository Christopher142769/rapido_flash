/**
 * Crée le catalogue global d'accompagnements à partir de la carte actuelle et des accompagnements
 * déjà saisis par plat (une seule fois : seulement si le catalogue est vide).
 */
const MealSide = require('../models/MealSide');
const MealProduct = require('../models/MealProduct');
const { normSideName } = require('./mealSides');

const DEFAULT_SIDES = [
  ['Riz', 0, 500],
  ['Légumes sautés', 0, 500],
  ['Akassa', 0, 500],
  ['Attiéké', 0, 500],
  ['Aloko', 0, 500],
  ['Banane bouillie', 0, 500],
  ['Spaghetti', 0, 500],
  ['Wassa wassa', 0, 500],
  ['Frites', 500, 1000],
];

/** Variantes d'orthographe héritées des anciennes données par plat → nom officiel. */
const ALIASES = {
  'legume saute': 'Légumes sautés',
  'legumes saute': 'Légumes sautés',
  'legume sautes': 'Légumes sautés',
  alloco: 'Aloko',
  aloco: 'Aloko',
  frite: 'Frites',
  'banane bouilli': 'Banane bouillie',
  'banane bouillies': 'Banane bouillie',
};

/** Fusionne les doublons (une seule fois) : « Légume sauté », « Alloco »… → nom officiel, prix par défaut. */
async function mergeAliasSides() {
  const flagged = await MealSettingsFlag.get();
  if (flagged) return;
  const sides = await MealSide.find();
  for (const side of sides) {
    const officialName = ALIASES[normSideName(side.name)];
    if (!officialName) continue;
    const target = sides.find((o) => o !== side && normSideName(o.name) === normSideName(officialName));
    const defaults = DEFAULT_SIDES.find(([n]) => n === officialName);
    if (target) {
      const ids = new Set([...(target.products || []), ...(side.products || [])].map(String));
      target.products = [...ids];
      target.allProducts = target.allProducts || side.allProducts;
      await target.save();
      await MealSide.deleteOne({ _id: side._id });
    } else {
      side.name = officialName;
      if (defaults) {
        side.price = defaults[1];
        side.extraPrice = defaults[2];
        side.extraEnabled = true;
      }
      await side.save();
    }
  }
  await MealSettingsFlag.set();
  console.log('🍚 Accompagnements : doublons fusionnés');
}

const MealSettingsFlag = {
  async get() {
    const MealShopSettings = require('../models/MealShopSettings');
    return !!(await MealShopSettings.collection.findOne({ key: 'default', sidesAliasesMergedV1: true }));
  },
  async set() {
    const MealShopSettings = require('../models/MealShopSettings');
    await MealShopSettings.collection.updateOne(
      { key: 'default' },
      { $set: { sidesAliasesMergedV1: true } },
      { upsert: false }
    );
  },
};

async function ensureMealSides() {
  if ((await MealSide.countDocuments()) > 0) {
    await mergeAliasSides();
    return;
  }

  const products = await MealProduct.find().lean();
  const byKey = new Map();
  DEFAULT_SIDES.forEach(([name, price, extraPrice], i) => {
    byKey.set(normSideName(name), { name, price, extraPrice, extraEnabled: true, products: [], sortOrder: i * 10 });
  });

  let extraOrder = DEFAULT_SIDES.length * 10;
  for (const p of products) {
    for (const a of p.accompagnements || []) {
      if (a.available === false) continue;
      const key = normSideName(a.name);
      if (!key) continue;
      if (!byKey.has(key)) {
        byKey.set(key, {
          name: String(a.name).trim(),
          price: Math.max(0, Math.round(Number(a.price) || 0)),
          extraPrice: 500,
          extraEnabled: false,
          products: [],
          sortOrder: (extraOrder += 10),
        });
      }
      byKey.get(key).products.push(p._id);
    }
  }

  await MealSide.insertMany([...byKey.values()]);
  await mergeAliasSides();
  console.log(`🍚 Catalogue accompagnements créé (${byKey.size})`);
}

module.exports = { ensureMealSides };
