import axios from 'axios';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { isCapacitorAndroid } from './capacitorNativeNotifications';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let listenersAttached = false;
/** Dernier jeton reçu du SDK (pour désinscription à la déconnexion). */
let lastFcmToken = null;

function isNativeMobile() {
  try {
    return Capacitor.isNativePlatform() && (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios');
  } catch {
    return false;
  }
}

/**
 * Écouteurs FCM : à brancher une fois au démarrage sur l’app native.
 * L’enregistrement serveur se fait quand un JWT est présent (utilisateur connecté).
 */
export function ensureCapacitorFcmListeners() {
  if (!isNativeMobile() || listenersAttached) return;
  listenersAttached = true;
  console.info('[FCM] listeners attached');

  PushNotifications.addListener('registration', async ({ value }) => {
    lastFcmToken = value || null;
    console.info('[FCM] registration token received', value ? `...${String(value).slice(-10)}` : 'empty');
    const jwt = localStorage.getItem('token');
    if (!jwt || !value) {
      console.warn('[FCM] token not synced: missing jwt or token');
      return;
    }
    try {
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      await axios.post(
        `${API_BASE}/push/fcm/register`,
        { token: value, platform },
        { headers: { Authorization: `Bearer ${jwt}` }, timeout: 15000 }
      );
      console.info('[FCM] token synced to backend');
    } catch (_) {
      console.warn('[FCM] token sync failed (will retry later)');
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.warn('[FCM] registrationError', err?.error || err);
  });
}

/** Si le SDK a déjà fourni un jeton avant la connexion, l’envoyer au backend une fois le JWT disponible. */
export async function syncStoredFcmTokenWithServer() {
  const jwt = localStorage.getItem('token');
  const tok = lastFcmToken;
  if (!jwt || !tok || !isNativeMobile()) {
    console.info('[FCM] sync skipped: missing jwt/token or not native');
    return;
  }
  try {
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    await axios.post(
      `${API_BASE}/push/fcm/register`,
      { token: tok, platform },
      { headers: { Authorization: `Bearer ${jwt}` }, timeout: 15000 }
    );
    console.info('[FCM] stored token synced to backend');
  } catch (_) {
    console.warn('[FCM] stored token sync failed');
  }
}

/** Appelé après permission « receive » accordée (souvent avec les notifs locales). */
export async function registerCapacitorFcmAndSync() {
  if (!isNativeMobile()) return;
  ensureCapacitorFcmListeners();
  try {
    let perm = await PushNotifications.checkPermissions();
    console.info('[FCM] permission state', perm?.receive || 'unknown');
    if (perm.receive !== 'granted') {
      console.info('[FCM] requesting push permission from native SDK');
      try {
        perm = await PushNotifications.requestPermissions();
      } catch (e) {
        console.warn('[FCM] requestPermissions failed', e?.message || e);
      }
      console.info('[FCM] permission state after request', perm?.receive || 'unknown');
      if (perm.receive !== 'granted') {
        console.warn('[FCM] register skipped: permission not granted');
        return;
      }
    }
    await PushNotifications.register();
    console.info('[FCM] register requested to native SDK');
    // Some devices deliver registration callback slightly later.
    setTimeout(() => {
      void syncStoredFcmTokenWithServer();
    }, 2000);
  } catch (e) {
    console.warn('[FCM] register', e?.message || e);
  }
}

/** Android : enregistre FCM si les permissions push sont déjà OK (retour utilisateur). */
export async function registerCapacitorFcmIfAndroidReady() {
  if (!isCapacitorAndroid()) return;
  await registerCapacitorFcmAndSync();
}

/**
 * À appeler avant suppression du JWT (déconnexion), pour ne plus pousser vers ce compte sur cet appareil.
 */
export async function unregisterCapacitorFcmFromServerBeforeLogout() {
  const jwt = localStorage.getItem('token');
  const tok = lastFcmToken;
  if (!jwt || !tok) return;
  try {
    await axios.post(
      `${API_BASE}/push/fcm/unregister`,
      { token: tok },
      { headers: { Authorization: `Bearer ${jwt}` }, timeout: 8000 }
    );
  } catch (_) {
    /* best effort */
  }
}
