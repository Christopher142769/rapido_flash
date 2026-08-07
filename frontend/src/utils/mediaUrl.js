/**
 * Origine backend pour servir /uploads et construire les URLs médias.
 * Évite le piège String.replace('/api', '') qui casse les hosts contenant "api"
 * (ex. https://api.rapido.bj/api → https://.rapido.bj).
 */
export function getApiUrl() {
  return String(process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
    .trim()
    .replace(/\/$/, '');
}

export function getMediaBaseUrl() {
  const explicit = String(process.env.REACT_APP_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (explicit) return explicit;
  return getApiUrl().replace(/\/api\/?$/, '');
}

/**
 * Transforme un chemin relatif, un filename media-*, ou une URL absolue en URL affichable.
 */
export function resolveMediaUrl(path, baseUrl = getMediaBaseUrl()) {
  const src = typeof path === 'string' ? path.trim() : '';
  if (!src || src.includes('placeholder.com')) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  const base = String(baseUrl || getMediaBaseUrl()).replace(/\/$/, '');

  if (/^https?:\/\//i.test(src) || src.startsWith('//')) {
    const absolute = src.startsWith('//') ? `https:${src}` : src;
    try {
      const u = new URL(absolute);
      // Cloudinary et autres CDN : laisser tel quel
      if (u.hostname.includes('cloudinary.com') || u.hostname.includes('res.cloudinary')) {
        return absolute;
      }
      // Anciennes URLs backend /uploads/... vers un host mort → rebaser sur l’API actuelle
      if (u.pathname.startsWith('/uploads/')) {
        const baseOrigin = (() => {
          try {
            return new URL(base.startsWith('http') ? base : `https://${base}`).origin;
          } catch {
            return '';
          }
        })();
        if (baseOrigin && u.origin !== baseOrigin) {
          return `${baseOrigin}${u.pathname}${u.search}`;
        }
      }
    } catch {
      /* keep absolute */
    }
    return absolute;
  }

  // Anciens enregistrements parfois stockés sans dossier (media-ts-hash.ext)
  if (/^media-\d+-[a-f0-9]+\.[a-z0-9]+$/i.test(src)) {
    return `${base}/uploads/medias/${src}`;
  }

  if (src.startsWith('/')) return `${base}${src}`;
  return `${base}/${src}`;
}
