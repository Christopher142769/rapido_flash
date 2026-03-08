const mongoose = require('mongoose');
require('dotenv').config();
const Plat = require('../models/Plat');
const Restaurant = require('../models/Restaurant');
const Banniere = require('../models/Banniere');

async function associateAllToRestaurant() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rapido_flash', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB');

    // Récupérer le premier restaurant actif (ou créer un restaurant par défaut si aucun n'existe)
    let restaurant = await Restaurant.findOne({ actif: true });
    
    if (!restaurant) {
      console.log('⚠️  Aucun restaurant actif trouvé. Création d\'un restaurant par défaut...');
      // Créer un restaurant par défaut
      restaurant = new Restaurant({
        nom: 'Restaurant par défaut',
        description: 'Restaurant par défaut pour tous les plats',
        position: {
          latitude: 6.3925181,
          longitude: 2.3942913,
          adresse: 'Cotonou, Bénin'
        },
        actif: true,
        fraisLivraison: 0
      });
      await restaurant.save();
      console.log('✅ Restaurant par défaut créé:', restaurant._id);
    }

    console.log('📦 Restaurant utilisé:', restaurant.nom, 'ID:', restaurant._id);
    const restaurantId = restaurant._id;

    // 1. Associer tous les plats à ce restaurant
    console.log('\n🔗 Association des plats au restaurant...');
    const plats = await Plat.find({});
    console.log(`📋 ${plats.length} plat(s) trouvé(s)`);

    let platsMisAJour = 0;
    for (const plat of plats) {
      let updated = false;
      
      // Vérifier si le plat est déjà associé à ce restaurant
      const existingIndex = plat.restaurants.findIndex(r => 
        r.restaurant.toString() === restaurantId.toString()
      );
      
      if (existingIndex === -1) {
        // Ajouter l'association
        plat.restaurants.push({
          restaurant: restaurantId,
          disponible: true
        });
        updated = true;
      } else {
        // S'assurer que l'association est disponible
        if (plat.restaurants[existingIndex].disponible !== true) {
          plat.restaurants[existingIndex].disponible = true;
          updated = true;
        }
      }
      
      if (updated) {
        await plat.save();
        platsMisAJour++;
        console.log(`  ✅ Plat "${plat.nom}" associé au restaurant`);
      }
    }

    console.log(`\n✅ ${platsMisAJour} plat(s) mis à jour`);

    // 2. Associer toutes les bannières à ce restaurant
    console.log('\n🔗 Association des bannières au restaurant...');
    const bannieres = await Banniere.find({});
    console.log(`📋 ${bannieres.length} bannière(s) trouvée(s)`);

    let bannieresMisAJour = 0;
    for (const banniere of bannieres) {
      if (!banniere.restaurant || banniere.restaurant.toString() !== restaurantId.toString()) {
        banniere.restaurant = restaurantId;
        await banniere.save();
        bannieresMisAJour++;
        console.log(`  ✅ Bannière "${banniere._id}" associée au restaurant`);
      }
    }

    console.log(`\n✅ ${bannieresMisAJour} bannière(s) mise(s) à jour`);

    console.log(`\n🎉 Terminé avec succès !`);
    console.log(`   - Restaurant: ${restaurant.nom} (${restaurant._id})`);
    console.log(`   - Plats associés: ${platsMisAJour}`);
    console.log(`   - Bannières associées: ${bannieresMisAJour}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
associateAllToRestaurant();
