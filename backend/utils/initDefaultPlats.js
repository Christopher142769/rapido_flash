const Plat = require('../models/Plat');
const Restaurant = require('../models/Restaurant');

// Ne pas utiliser d'URL d'image par défaut - le frontend gérera les placeholders
// Les plats seront créés sans image, et le frontend affichera des placeholders colorés

const categoriesEtPlats = [
  {
    categorie: '🐟 Nos Spécialités de Poisson',
    plats: [
      { nom: 'Tchiep King Fish', description: 'Spécialité de poisson', prix: 3500 },
      { nom: 'Couronne du Feu', description: 'Poisson braisé aux saveurs d\'Afrique', prix: 4000 },
      { nom: 'Couronne du Lac', description: 'Poisson en sauce claire', prix: 3800 },
      { nom: 'Poisson Satay', description: 'Filet de poisson grillé, sauce parfumée', prix: 4200 },
      { nom: 'Pepper soupe royale', description: 'Soupe épicée au poisson', prix: 3000 },
      { nom: 'Rougaille de King Fish', description: 'Rougaille traditionnel', prix: 3600 },
      { nom: 'Gbekouin du Terroir', description: 'Spécialité locale et ses déclinaisons', prix: 4500 },
      { nom: 'Sauce crincrin aux 3 pièces', description: 'Sauce crincrin avec 3 pièces de poisson', prix: 5000 }
    ]
  },
  {
    categorie: '🍝 Nos Pâtes',
    plats: [
      { nom: 'Spaghetti créole aux boulettes de poisson', description: 'Spaghetti à la créole avec boulettes de poisson', prix: 3500 },
      { nom: 'Spaghetti bolognaise au poisson', description: 'Spaghetti bolognaise avec poisson', prix: 3800 },
      { nom: 'Tagliatelles à la crème fraîche aux dés de filet de poisson', description: 'Tagliatelles crémeuses avec filet de poisson', prix: 4200 }
    ]
  },
  {
    categorie: '🍚 Nos Garnitures',
    plats: [
      { nom: 'Riz pilaf', description: 'Riz pilaf parfumé', prix: 500 },
      { nom: 'Riz oriental', description: 'Riz à l\'orientale', prix: 500 },
      { nom: 'Agbéli', description: 'Accompagnement traditionnel', prix: 500 },
      { nom: 'Atchiekè', description: 'Semoule de manioc', prix: 500 },
      { nom: 'Aloco', description: 'Plantains frits', prix: 500 },
      { nom: 'Couscous', description: 'Couscous traditionnel', prix: 500 },
      { nom: 'Dakouin', description: 'Accompagnement local', prix: 500 },
      { nom: 'Akassa', description: 'Pâte de maïs', prix: 500 },
      { nom: 'Telibo', description: 'Accompagnement traditionnel', prix: 500 },
      { nom: 'Igname pilé (groupe)', description: 'Igname pilé pour groupe', prix: 2000 },
      { nom: 'Pâte blanche', description: 'Pâte blanche traditionnelle', prix: 500 },
      { nom: 'Amiwo', description: 'Pâte de maïs fermentée', prix: 500 },
      { nom: 'Frites d\'igname', description: 'Frites d\'igname croustillantes', prix: 800 },
      { nom: 'Frites de pomme de terre', description: 'Frites de pommes de terre', prix: 800 },
      { nom: 'Frites de patate douce', description: 'Frites de patates douces', prix: 800 }
    ]
  },
  {
    categorie: '🥟 Nos Snacks & Entrées',
    plats: [
      { nom: 'Nems au poisson et julienne de légumes', description: 'Nems croustillants au poisson', prix: 2500 },
      { nom: 'Pastels au poisson', description: 'Pastels frits au poisson', prix: 2000 },
      { nom: 'Samoussas au poisson', description: 'Samoussas au poisson épicés', prix: 2000 },
      { nom: 'Chawarma au poisson', description: 'Chawarma au poisson avec légumes', prix: 3000 }
    ]
  }
];

async function initDefaultPlats() {
  try {
    // Récupérer tous les restaurants actifs
    const restaurants = await Restaurant.find({ actif: true });
    
    if (restaurants.length === 0) {
      console.log('⚠️  Aucun restaurant trouvé. Les plats par défaut seront créés lors de la création du premier restaurant.');
      return;
    }

    let totalPlats = 0;
    let platsCrees = 0;
    let platsExistant = 0;

    // Pour chaque catégorie
    for (const categorieData of categoriesEtPlats) {
      // Pour chaque plat de la catégorie
      for (const platData of categorieData.plats) {
        totalPlats++;
        
        // Vérifier si le plat existe déjà
        const platExistant = await Plat.findOne({ 
          nom: platData.nom,
          categorie: categorieData.categorie
        });

        if (platExistant) {
          // Mettre à jour le plat existant si nécessaire
          let updated = false;
          
          if (platExistant.description !== platData.description) {
            platExistant.description = platData.description;
            updated = true;
          }
          
          if (platExistant.prix !== platData.prix) {
            platExistant.prix = platData.prix;
            updated = true;
          }
          
          if (platExistant.categorie !== categorieData.categorie) {
            platExistant.categorie = categorieData.categorie;
            updated = true;
          }
          
          // Ne pas forcer d'image - le frontend gérera les placeholders
          // Si l'utilisateur veut une image, il peut l'ajouter via le dashboard
          
          // Associer à tous les restaurants actifs qui ne l'ont pas encore
          for (const restaurant of restaurants) {
            const restaurantId = restaurant._id;
            const existingRestaurantIndex = platExistant.restaurants.findIndex(r => 
              r.restaurant.toString() === restaurantId.toString()
            );
            
            if (existingRestaurantIndex === -1) {
              platExistant.restaurants.push({
                restaurant: restaurantId,
                disponible: true
              });
              updated = true;
            }
          }
          
          if (updated) {
            await platExistant.save();
            platsExistant++;
          }
        } else {
          // Créer un nouveau plat sans image (le frontend gérera les placeholders)
          const nouveauPlat = new Plat({
            nom: platData.nom,
            description: platData.description,
            prix: platData.prix,
            categorie: categorieData.categorie,
            // Pas d'image par défaut - le frontend affichera un placeholder coloré
            disponible: true,
            restaurants: restaurants.map(restaurant => ({
              restaurant: restaurant._id,
              disponible: true
            }))
          });

          await nouveauPlat.save();
          platsCrees++;
        }
      }
    }

    if (platsCrees > 0 || platsExistant > 0) {
      console.log(`✅ Plats par défaut initialisés: ${platsCrees} créés, ${platsExistant} mis à jour`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des plats par défaut:', error);
    // Ne pas bloquer le démarrage du serveur en cas d'erreur
  }
}

module.exports = initDefaultPlats;
