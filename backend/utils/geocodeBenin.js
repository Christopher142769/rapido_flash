const ZONE_CENTROIDS = {
  Cotonou: { latitude: 6.3703, longitude: 2.3912 },
  Calavi: { latitude: 6.4485, longitude: 2.3558 },
  'Porto-Novo': { latitude: 6.4969, longitude: 2.6283 },
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function jitterCoords(lat, lng, seed = 0) {
  const offset = ((seed % 7) - 3) * 0.008;
  return { latitude: lat + offset, longitude: lng + offset * 1.2 };
}

function getZoneCentroid(zone) {
  return ZONE_CENTROIDS[zone] || ZONE_CENTROIDS.Cotonou;
}

async function nominatimGeocode(query, zone) {
  const q = String(query || '').trim();
  if (!q || q.length < 4) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const params = new URLSearchParams({
      q: `${q}, Bénin`,
      format: 'json',
      limit: '1',
    });
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'RapidoFlash/1.0 (delivery-mission)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.[0];
    if (!hit?.lat || !hit?.lon) return null;
    return { latitude: Number(hit.lat), longitude: Number(hit.lon) };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeAddress(address, zone, seed = 0) {
  const fromNominatim = await nominatimGeocode(address, zone);
  if (fromNominatim) return fromNominatim;
  const base = getZoneCentroid(zone);
  return jitterCoords(base.latitude, base.longitude, seed);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  ZONE_CENTROIDS,
  getZoneCentroid,
  geocodeAddress,
  haversineKm,
};
