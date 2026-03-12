/**
 * Vide la base de données de tous les plats et des catégories dérivées.
 * Les catégories domaine (CategorieDomaine) ne sont PAS supprimées.
 * À exécuter une fois pour passer au modèle "livraison tous produits".
 *
 * Usage: node scripts/clearDefaultPlatsAndCategories.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Plat = require('../models/Plat');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rapido_flash';

async function run() {
  await mongoose.connect(MONGODB_URI);
  const deleted = await Plat.deleteMany({});
  console.log('✅ Plats supprimés:', deleted.deletedCount);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
