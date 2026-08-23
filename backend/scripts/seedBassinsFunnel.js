/**
 * Crée / met à jour le formulaire bassins-devis et le produit shop bassin.
 * Usage : node backend/scripts/seedBassinsFunnel.js [--force]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const ensureBassinsFunnel = require('../utils/ensureBassinsFunnel');

async function main() {
  const force = process.argv.includes('--force');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapido_flash';
  await mongoose.connect(mongoUri);
  console.log('📊 MongoDB connecté\n');
  await ensureBassinsFunnel({ force });
  await mongoose.disconnect();
  console.log('\n🎣 Funnel bassins prêt.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
