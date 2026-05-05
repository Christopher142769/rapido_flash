import axios from 'axios';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { isCapacitorAndroid } from './capacitorNativeNotifications';

function getApiBase() {
  const raw = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  return String(raw).trim().replace(/\/$/, '');
}

const API_BASE = getApiBase();

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

async function fcmClientDebug(payload) {
  try {
    const jwt = localStorage.getItem('token');
    if (!jwt || !isNativeMobile()) return;
    await axios.post(`${API_BASE}/push/fcm/debug`, payload, {
      headers: { Authorization: `Bearer ${jwt}` },
      timeout: 8000,
    });
  } catch {
    /* best effort — ne pas bloquer l’enregistrement FCM */
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
    void fcmClientDebug({
      step: 'registration_token',
      tokenLen: value ? String(value).length : 0,
      hasJwt: !!jwt,
    });
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
      void fcmClientDebug({ step: 'register_http_ok' });
    } catch (err) {
      console.warn('[FCM] token sync failed', err?.response?.status, err?.message || err);
      void fcmClientDebug({
        step: 'register_http_error',
        status: err?.response?.status,
        message: err?.response?.data?.message || err?.message,
      });
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    const msg = err?.error || err;
    console.warn('[FCM] registrationError', msg);
    void fcmClientDebug({ step: 'registration_error', message: String(msg).slice(0, 200) });
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
  } catch (err) {
    console.warn('[FCM] stored token sync failed', err?.response?.status, err?.message || err);
  }
}

function scheduleFcmSyncRetries() {
  const delays = [1000, 3000, 8000];
  for (const ms of delays) {
    setTimeout(() => {
      void syncStoredFcmTokenWithServer();
    }, ms);
  }
}

/** Appelé après permission « receive » accordée (souvent avec les notifs locales). */
export async function registerCapacitorFcmAndSync() {
  let platform = 'web';
  try {
    platform = Capacitor.getPlatform();
  } catch {
    /* ignore */
  }
  const native = isNativeMobile();
  void fcmClientDebug({ step: 'register_start', native, platform });

  if (!native) return;
  ensureCapacitorFcmListeners();
  try {
    let perm = await PushNotifications.checkPermissions();
    console.info('[FCM] permission state', perm?.receive || 'unknown');
    void fcmClientDebug({ step: 'perm_checked', receive: perm?.receive });
    if (perm.receive !== 'granted') {
      console.info('[FCM] requesting push permission from native SDK');
      try {
        perm = await PushNotifications.requestPermissions();
      } catch (e) {
        console.warn('[FCM] requestPermissions failed', e?.message || e);
        void fcmClientDebug({ step: 'request_perm_exception', message: String(e?.message || e).slice(0, 200) });
      }
      console.info('[FCM] permission state after request', perm?.receive || 'unknown');
      void fcmClientDebug({ step: 'perm_after_request', receive: perm?.receive });
      if (perm.receive !== 'granted') {
        console.warn('[FCM] register skipped: permission not granted');
        void fcmClientDebug({ step: 'register_skipped_not_granted', receive: perm?.receive });
        return;
      }
    }
    await PushNotifications.register();
    console.info('[FCM] register requested to native SDK');
    void fcmClientDebug({ step: 'native_register_called' });
    setTimeout(() => {
      void syncStoredFcmTokenWithServer();
    }, 2000);
    scheduleFcmSyncRetries();
  } catch (e) {
    console.warn('[FCM] register', e?.message || e);
    void fcmClientDebug({ step: 'register_exception', message: String(e?.message || e).slice(0, 200) });
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
