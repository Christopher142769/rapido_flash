/**
 * Plats Repas vendus aussi dans le Shop (/shop/<slug>).
 *
 * La fiche /shop/<slug> affiche le plat Repas lui-même (même produit Mongo MealProduct) :
 * images, nom, copywriting, prix, promo, accompagnements, options, frais de livraison par
 * ville, formulaire, suivi Meta Pixel et notifications de commande restent ceux de /repas.
 * Rien n'est recopié : tout changement fait dans le dashboard Shop Repas vaut pour les deux.
 *
 * Clé : slug Shop (URL) → slugs possibles du plat Repas, essayés dans l'ordre
 * (en production le plat s'appelle « chawarma », le catalogue d'origine « shawarma »).
 */
const CHAWARMA_SLUGS = ['chawarma', 'shawarma'];

export const SHOP_MEAL_ALIASES = {
  chawarma: CHAWARMA_SLUGS,
  shawarma: CHAWARMA_SLUGS,
};

/** Slugs du plat Repas à afficher pour /shop/<shopSlug>, ou null pour un produit Shop classique. */
export function shopMealSlugFor(shopSlug) {
  const key = String(shopSlug || '').trim().toLowerCase();
  return SHOP_MEAL_ALIASES[key] || null;
}
