const Restaurant = require('../models/Restaurant');
const { generateUniqueRestaurantLineCode } = require('./platformLineCode');

/** Renseigne platformLineCode pour les fiches créées avant l’introduction du champ. */
async function ensurePlatformLineCodes() {
  try {
    const missing = await Restaurant.find({
      $or: [{ platformLineCode: { $exists: false } }, { platformLineCode: '' }, { platformLineCode: null }],
    })
      .select('_id')
      .lean();
    for (const row of missing) {
      const code = await generateUniqueRestaurantLineCode(Restaurant);
      // eslint-disable-next-line no-await-in-loop
      await Restaurant.updateOne({ _id: row._id }, { $set: { platformLineCode: code } });
    }
    if (missing.length) {
      console.log(`✅ Identifiants ligne Rapido : ${missing.length} structure(s) mise(s) à jour`);
    }
  } catch (e) {
    console.error('ensurePlatformLineCodes:', e.message);
  }
}

module.exports = ensurePlatformLineCodes;
