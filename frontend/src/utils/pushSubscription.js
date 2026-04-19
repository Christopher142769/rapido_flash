import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** En prod uniquement : enregistre le SW (nécessaire pour recevoir les push hors onglet). */
export async function registerServiceWorkerForPush() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (process.env.NODE_ENV !== 'production') return null;
  try {
    const reg = await navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
    await reg.update();
    return reg;
  } catch (e) {
    return null;
  }
}

/**
 * Abonne l’appareil au push serveur (VAPID) et envoie l’endpoint au backend.
 * À appeler après permission notifications accordée.
 */
export async function syncPushSubscriptionWithServer() {
  const token = localStorage.getItem('token');
  if (!token) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!('PushManager' in window)) return;

  const reg = await registerServiceWorkerForPush();
  if (!reg) return;

  try {
    const { data } = await axios.get(`${API_BASE}/push/vapid-public-key`, {
      timeout: 8000,
    });
    if (!data?.publicKey) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await axios.post(
      `${API_BASE}/push/subscribe`,
      { subscription: sub.toJSON() },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (e) {
    /* Serveur sans VAPID ou réseau : ignorer */
  }
}
