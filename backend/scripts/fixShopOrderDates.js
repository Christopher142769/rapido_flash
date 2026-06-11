/**
 * Corrige les dates de commande Shop en base (orderDate = jour de la commande).
 * Usage : node backend/scripts/fixShopOrderDates.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const ensureShopOrderDates = require('../utils/ensureShopOrderDates');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapido_flash';
  await mongoose.connect(uri);
  console.log('📊 Base:', mongoose.connection.name);
  await ensureShopOrderDates();
  await mongoose.disconnect();
  console.log('Terminé.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
