/**
 * Contenus dynamiques (MongoDB) : champs optionnels *En pour l’anglais.
 * Si la langue est EN et qu’un champ anglais est vide, on retombe sur le français.
 */

function isEnglish(language) {
  return String(language || 'fr').toLowerCase().startsWith('en');
}

export function pickLocalized(language, obj, field) {
  if (!obj) return '';
  const enKey = `${field}En`;
  if (isEnglish(language)) {
    const en = obj[enKey];
    if (en != null && String(en).trim() !== '') {
      return String(en).trim();
    }
  }
  const v = obj[field];
  return v != null ? String(v) : '';
}

/** Nom affiché d’un produit (accueil / recherche) */
export function pickProductDisplayName(language, p) {
  if (!p) return '';
  if (isEnglish(language)) {
    if (p.nomAfficheAccueilEn != null && String(p.nomAfficheAccueilEn).trim() !== '') {
      return String(p.nomAfficheAccueilEn).trim();
    }
    if (p.nomAfficheAccueil != null && String(p.nomAfficheAccueil).trim() !== '') {
      return String(p.nomAfficheAccueil).trim();
    }
    if (p.nomEn != null && String(p.nomEn).trim() !== '') {
      return String(p.nomEn).trim();
    }
    return p.nom != null ? String(p.nom) : '';
  }
  if (p.nomAfficheAccueil != null && String(p.nomAfficheAccueil).trim() !== '') {
    return String(p.nomAfficheAccueil).trim();
  }
  return p.nom != null ? String(p.nom) : '';
}

/** Texte des aperçus produits sur les cartes structure (liste home) */
export function structureProductNamesText(structure, t, productDisplayName) {
  const fn = typeof productDisplayName === 'function' ? productDisplayName : (p) => pickProductDisplayName('fr', p);
  const names = (structure.produitsApercu || []).map((p) => fn(p)).filter(Boolean);
  if (names.length) return names.join(' · ');
  return t('home', 'noProductsPreview');
}
