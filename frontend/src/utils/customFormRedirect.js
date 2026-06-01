/** Page de remerciement par défaut (URL affichée dans le navigateur). */
export const DEFAULT_FORM_THANKS_PATH = '/recrutement/merci';

/**
 * Chemin interne pour react-router, ou redirection externe via assign.
 * @returns {string|null} chemin relatif si navigation SPA, null si redirection externe déjà lancée
 */
export function toInAppThanksPath(url) {
  const fallback = DEFAULT_FORM_THANKS_PATH;
  const s = String(url || '').trim() || fallback;
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  try {
    const u = new URL(s);
    if (u.origin === window.location.origin) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
    window.location.assign(u.href);
    return null;
  } catch {
    return fallback;
  }
}
