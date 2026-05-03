import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export const ORDERS_CHANNEL_ID = 'orders-high';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL_ID, {
    name: 'Commandes & messages',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    sound: 'default',
  });
}

/**
 * @returns {Promise<{ token?: string, error?: string }>}
 */
export async function getExpoPushTokenForDevice() {
  if (!Device.isDevice) {
    return {
      error:
        'Utilisez un téléphone réel ou un build de développement : le simulateur ne reçoit pas les jetons Expo.',
    };
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    return { error: 'Les notifications sont refusées. Activez-les dans les réglages Android.' };
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const opts = projectId ? { projectId } : undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(opts);
    return { token: data };
  } catch (e) {
    const msg =
      e?.message ||
      'Jeton push indisponible. Créez un projet Expo (eas init), renseignez EXPO_PUBLIC_EAS_PROJECT_ID puis refaites un build natif.';
    return { error: msg };
  }
}
