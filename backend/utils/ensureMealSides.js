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

async function ensureMealSides() {
  if ((await MealSide.countDocuments()) > 0) return;

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
  console.log(`🍚 Catalogue accompagnements créé (${byKey.size})`);
}

module.exports = { ensureMealSides };
