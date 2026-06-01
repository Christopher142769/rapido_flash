/** Page de remerciement par défaut (URL affichée dans le navigateur). */
export const DEFAULT_FORM_THANKS_PATH = '/recrutement/merci';

/**
 * Chemin ou URL absolue pour la page merci (navigation complète, URL visible).
 * @returns {string|null} chemin/URL à charger, null si redirection externe déjà lancée
 */
export function toInAppThanksPath(url) {
  const fallback = DEFAULT_FORM_THANKS_PATH;
  const s = String(url || '').trim() || fallback;
  if (s.startsWith('/') && !s.startsWith('//')) {
    try {
      return new URL(s, window.location.origin).href;
    } catch {
      return new URL(fallback, window.location.origin).href;
    }
  }
  try {
    const u = new URL(s);
    if (u.origin === window.location.origin) {
      return u.href;
    }
    window.location.assign(u.href);
    return null;
  } catch {
    try {
      return new URL(fallback, window.location.origin).href;
    } catch {
      return fallback;
    }
  }
}
