const mongoose = require('mongoose');
require('dotenv').config();
const initDefaultPlats = require('../utils/initDefaultPlats');

// Script standalone pour créer les plats par défaut
async function createDefaultPlats() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rapido_flash', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB');

    // Utiliser la fonction d'initialisation
    await initDefaultPlats();

    console.log(`\n✅ Terminé avec succès !`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
createDefaultPlats();
