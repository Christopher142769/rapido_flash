/** Pixel Meta RAPIDO (recrutement + site). */
export const META_PIXEL_ID = '1536465181424806';

export function trackMeta(event, params = {}) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', event, params);
}

/** Évènements selon la route SPA (hors chargement initial index.html). */
export function trackMetaForRoute(pathname) {
  const p = String(pathname || '').replace(/\/$/, '') || '/';

  if (p.startsWith('/form/')) {
    trackMeta('ViewContent', {
      content_name: 'Formulaire candidature',
      content_category: 'Recrutement',
    });
    return;
  }

  if (p === '/recrutement/merci') {
    trackMeta('CompleteRegistration', {
      content_name: 'Candidature reçue',
      content_category: 'Recrutement',
    });
    return;
  }

  if (p.startsWith('/recrutement')) {
    trackMeta('ViewContent', {
      content_name: 'Page Carrières',
      content_category: 'Recrutement',
    });
    return;
  }

  trackMeta('PageView');
}
