/** Résout une erreur axios en état d’affichage pour la fiche Shop. */
export function resolveShopProductFetchError(err) {
  const status = err?.response?.status;
  const apiMessage = String(err?.response?.data?.message || '').trim();

  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') {
      return {
        kind: 'timeout',
        title: 'Connexion trop lente',
        message:
          'Le chargement a pris trop de temps. Réessayez ou passez en Wi‑Fi / 4G si vous êtes en données mobiles.',
        canRetry: true,
        hintFacebook: false,
      };
    }
    return {
      kind: 'network',
      title: 'Connexion impossible',
      message:
        'Impossible de joindre nos serveurs. Vérifiez votre connexion internet et réessayez.',
      canRetry: true,
      hintFacebook: isLikelyFacebookInAppBrowser(),
    };
  }

  if (status === 404 && apiMessage === 'Produit non publié') {
    return {
      kind: 'unpublished',
      title: 'Offre terminée',
      message: 'Cette offre n’est plus en ligne pour le moment.',
      canRetry: false,
      hintFacebook: false,
    };
  }

  if (status === 404) {
    return {
      kind: 'not_found',
      title: 'Produit introuvable',
      message: apiMessage || 'Ce lien n’est plus actif ou le produit n’existe pas.',
      canRetry: false,
      hintFacebook: false,
    };
  }

  if (status >= 500) {
    return {
      kind: 'server',
      title: 'Service indisponible',
      message:
        'Un problème technique temporaire empêche le chargement. Réessayez dans quelques instants.',
      canRetry: true,
      hintFacebook: false,
    };
  }

  return {
    kind: 'unknown',
    title: 'Chargement impossible',
    message: apiMessage || 'Une erreur inattendue s’est produite.',
    canRetry: true,
    hintFacebook: false,
  };
}

function isLikelyFacebookInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|FB_IAB|Instagram/i.test(ua);
}
