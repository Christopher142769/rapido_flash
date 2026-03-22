const CategorieDomaine = require('../models/CategorieDomaine');

/**
 * Catégories de domaine toujours présentes (créées au démarrage si absentes).
 * Modifiables ensuite dans le dashboard (nom, ordre, icône depuis la galerie).
 */
const DEFAULT_CATEGORIES_DOMAINE = [
  { code: 'restaurant', nom: 'Restaurant', ordre: 1 },
  { code: 'marche-frais', nom: 'Marché Frais', ordre: 2 },
  { code: 'construction', nom: 'Construction', ordre: 3 },
  { code: 'repas-sain', nom: 'Repas Sain', ordre: 4 },
  { code: 'cuisine-traditionnelle', nom: 'Cuisine traditionnelle', ordre: 5 },
  { code: 'super-marche', nom: 'Super marché', ordre: 6 },
  { code: 'fleurs-jardins', nom: 'Fleurs et Jardins', ordre: 7 },
  { code: 'nettoyage-sec', nom: 'Nettoyage à sec', ordre: 8 },
  { code: 'services-location', nom: 'Services de location', ordre: 9 },
  { code: 'cosmetique', nom: 'Cosmétique', ordre: 10 }
];

async function ensureDefaultCategoriesDomaine() {
  try {
    let created = 0;
    let linked = 0;

    for (const d of DEFAULT_CATEGORIES_DOMAINE) {
      const byCode = await CategorieDomaine.findOne({ code: d.code });
      if (byCode) continue;

      const byNom = await CategorieDomaine.findOne({ nom: d.nom });
      if (byNom) {
        byNom.code = d.code;
        if (byNom.ordre == null || byNom.ordre === undefined) {
          byNom.ordre = d.ordre;
        }
        await byNom.save();
        linked += 1;
        continue;
      }

      await CategorieDomaine.create({
        code: d.code,
        nom: d.nom,
        ordre: d.ordre
      });
      created += 1;
    }

    if (created > 0 || linked > 0) {
      console.log(
        `✅ Catégories domaine : ${created} créée(s), ${linked} existante(s) associée(s) au jeu par défaut.`
      );
    } else {
      console.log('✅ Catégories domaine par défaut : déjà présentes.');
    }
  } catch (error) {
    console.error('❌ Erreur ensureDefaultCategoriesDomaine:', error.message);
  }
}

module.exports = ensureDefaultCategoriesDomaine;
