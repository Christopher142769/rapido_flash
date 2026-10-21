const cache = new Map();
const TTL_MS = 24 * 3600 * 1000;

/**
 * Nom de lieu lisible (quartier, commune…) pour des coordonnées, via OpenStreetMap Nominatim.
 * Ne bloque jamais : renvoie null en cas de délai dépassé / erreur.
 * @returns {Promise<{place:string, nearby:string[]}|null>}
 */
async function reverseGeocode(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      zoom: '17',
      addressdetails: '1',
      'accept-language': 'fr',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RapidoFlash/1.0 (livreur-tracking)' },
    });
    if (!res.ok) return null;
    const a = (await res.json())?.address;
    if (!a) return null;
    const names = [
      a.amenity || a.shop || a.building || a.tourism,
      a.road,
      a.neighbourhood || a.quarter || a.suburb || a.hamlet || a.village,
      a.city_district || a.town || a.city || a.municipality,
      a.county || a.state_district,
      a.state,
    ].filter(Boolean);
    const uniq = [...new Set(names)];
    if (!uniq.length) return null;
    // Libellé principal : quartier + commune ; le reste (rue, repère, département) = alentours.
    const area = [a.neighbourhood || a.quarter || a.suburb || a.hamlet || a.village, a.city_district || a.town || a.municipality, a.city || a.county]
      .filter(Boolean);
    const place = [...new Set(area.length ? area : uniq.slice(0, 2))].join(', ');
    const nearby = uniq.filter((n) => !place.includes(n)).slice(0, 4);
    const value = { place, nearby };
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return value;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { reverseGeocode };
