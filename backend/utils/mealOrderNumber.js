const MealOrder = require('../models/MealOrder');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

async function generateMealOrderNumber(date = new Date()) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const dateStr = dayStart.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await MealOrder.countDocuments({
    createdAt: { $gte: dayStart, $lte: dayEnd },
  });
  return `REPAS-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

module.exports = { generateMealOrderNumber, startOfDay, endOfDay };
