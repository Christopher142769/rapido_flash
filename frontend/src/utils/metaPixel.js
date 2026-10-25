/** Pixel Meta RAPIDO (recrutement + site). */
export const META_PIXEL_ID = '1536465181424806';

/** eventId : identifiant stable (ex. purchase_<commande>) pour que Meta dédoublonne l’évènement. */
export function trackMeta(event, params = {}, eventId) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (eventId) window.fbq('track', event, params, { eventID: String(eventId) });
  else window.fbq('track', event, params);
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

  if (p === '/bassins-remerciements') {
    trackMeta('CompleteRegistration', {
      content_name: 'Demande bassin reçue',
      content_category: 'Bassins',
    });
    return;
  }

  if (p.startsWith('/bassins')) {
    trackMeta('ViewContent', {
      content_name: 'Page Bassins',
      content_category: 'Bassins',
    });
    return;
  }

  trackMeta('PageView');
}
