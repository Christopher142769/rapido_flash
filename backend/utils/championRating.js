const ChampionReview = require('../models/ChampionReview');
const Champion = require('../models/Champion');

async function recalcChampionRating(championId) {
  const reviews = await ChampionReview.find({ championId }).select('rating').lean();
  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count : 0;
  await Champion.findByIdAndUpdate(championId, {
    ratingAvg: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
  return { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count };
}

module.exports = { recalcChampionRating };
