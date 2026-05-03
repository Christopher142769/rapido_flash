import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

const CHANNEL_ID = 'rapido_alerts';
let channelEnsured = false;

export function isCapacitorAndroid() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/** Canal Android haute priorité (heads-up / son / vibration). */
export async function ensureRapidoAndroidNotificationChannel() {
  if (!isCapacitorAndroid() || channelEnsured) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Rapido — commandes & messages',
      description: 'Alertes tableau de bord et messagerie',
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    channelEnsured = true;
  } catch (_) {
    /* API < 26 ou indisponible */
  }
}

/**
 * Demande les autorisations natives Android 13+ (POST_NOTIFICATIONS) + couche locale Capacitor.
 * À combiner avec Notification.requestPermission() pour le Web Push dans la WebView.
 */
export async function requestAndroidNativeNotificationPermissions() {
  if (!isCapacitorAndroid()) return { display: 'unsupported', receive: 'unsupported' };
  await ensureRapidoAndroidNotificationChannel();
  let local = await LocalNotifications.checkPermissions();
  if (local.display === 'prompt' || local.display === 'prompt-with-rationale') {
    local = await LocalNotifications.requestPermissions();
  }
  let push = await PushNotifications.checkPermissions();
  if (push.receive === 'prompt' || push.receive === 'prompt-with-rationale') {
    push = await PushNotifications.requestPermissions();
  }
  return { display: local.display, receive: push.receive };
}

/**
 * Affiche une notification système Android (style app classique) depuis le JS.
 * Utilisé quand le résumé commandes/messages augmente (complète l’API Notification du WebView).
 */
export async function showRapidoAndroidTrayNotification({ title, body }) {
  if (!isCapacitorAndroid()) return false;
  await ensureRapidoAndroidNotificationChannel();
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return false;
  const id = Math.floor(Math.random() * 2000000000) + 1;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 1200) },
          smallIcon: 'ic_stat_rapido',
          iconColor: '#5C4033',
        },
      ],
    });
    return true;
  } catch (_) {
    return false;
  }
}

/** Au démarrage de l’app : prépare le canal (sans dialogue utilisateur). */
export function initCapacitorAndroidNotifications() {
  if (!isCapacitorAndroid()) return;
  void ensureRapidoAndroidNotificationChannel();
}

const STORAGE_NOTIF_LAUNCH = 'rapido_notif_launch_prompted_v1';

/**
 * Premier lancement Android : affiche le dialogue système POST_NOTIFICATIONS + demande WebView si possible.
 * Une seule fois par installation (localStorage) pour ne pas harceler.
 */
export async function promptAndroidNotificationPermissionOnFirstLaunch() {
  if (!isCapacitorAndroid()) return;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_NOTIF_LAUNCH) === '1') return;
    await requestAndroidNativeNotificationPermissions();
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (_) {
        /* certains WebView exigent un geste utilisateur */
      }
    }
  } catch (_) {
    /* ignore */
  } finally {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_NOTIF_LAUNCH, '1');
    } catch (_) {
      /* private mode */
    }
  }
}

/** Appel différé depuis index.js (laisser la WebView monter). */
export function scheduleAndroidNotificationPermissionPrompt() {
  if (!isCapacitorAndroid()) return;
  setTimeout(() => {
    void promptAndroidNotificationPermissionOnFirstLaunch();
  }, 1400);
}
