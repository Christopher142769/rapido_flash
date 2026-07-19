/** Chemins publics Shop Repas. */

export function mealCatalogPath() {
  return '/repas';
}

export function mealCartPath() {
  return '/repas/panier';
}

/** Fiche plat : /repas/commandes/nom-du-plat */
export function mealProductPath(slug) {
  const s = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  return s ? `/repas/commandes/${s}` : mealCatalogPath();
}

/** Confirmation après commande. */
export function mealConfirmationPath(slug) {
  const s = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  return s ? `/repas/${s}/commande` : '/repas/commande';
}
