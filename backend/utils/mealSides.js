/**
 * Accompagnements Shop Repas : catalogue global (MealSide) → accompagnements / suppléments par plat.
 */
const MealSide = require('../models/MealSide');

async function loadMealSides() {
  return MealSide.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
}

function sideAppliesToProduct(side, product) {
  if (side.available === false) return false;
  if (side.allProducts) return true;
  const id = String(product?._id || '');
  return (side.products || []).some((p) => String(p) === id);
}

function sidesForProduct(product, sides) {
  return (sides || [])
    .filter((s) => sideAppliesToProduct(s, product))
    .map((s) => ({
      _id: String(s._id),
      name: s.name,
      price: Math.max(0, Math.round(Number(s.price) || 0)),
      required: false,
      available: true,
      maxQuantity: 1,
    }));
}

function supplementsForProduct(product, sides) {
  if (product?.allowExtras === false) return [];
  return (sides || [])
    .filter((s) => s.available !== false && s.extraEnabled !== false)
    .map((s) => ({
      _id: String(s._id),
      name: s.name,
      price: Math.max(0, Math.round(Number(s.extraPrice) || 0)),
    }));
}

function normSideName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

module.exports = {
  loadMealSides,
  sidesForProduct,
  supplementsForProduct,
  normSideName,
};
