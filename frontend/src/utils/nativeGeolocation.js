import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

function isNativeMobile() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Retourne { latitude, longitude } en privilégiant le plugin natif Capacitor
 * (plus fiable sur Android/iOS que navigator.geolocation en WebView).
 */
export async function getBestCurrentPosition() {
  if (isNativeMobile()) {
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      await Geolocation.requestPermissions();
    }
    const pos = await Geolocation.getCurrentPosition(GEO_OPTIONS);
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      reject,
      GEO_OPTIONS
    );
  });
}
