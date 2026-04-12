const crypto = require('crypto');

/**
 * Identifiant téléphonique « plateforme » affiché aux clients (pas le numéro direct).
 */
async function generateUniqueRestaurantLineCode(RestaurantModel) {
  for (let i = 0; i < 24; i += 1) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `RP-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await RestaurantModel.exists({ platformLineCode: code });
    if (!exists) return code;
  }
  throw new Error('Impossible de générer un identifiant de ligne unique');
}

module.exports = { generateUniqueRestaurantLineCode };
