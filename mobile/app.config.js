/**
 * Variables : EXPO_PUBLIC_API_URL (ex. http://192.168.1.10:5000/api),
 * EXPO_PUBLIC_EAS_PROJECT_ID (obligatoire pour build / token push — après `eas init` sur expo.dev).
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined;

export default {
  expo: {
    name: 'Rapido',
    slug: 'rapido-flash',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'rapido',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'bj.rapido.mobile',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      package: 'bj.rapido.mobile',
      ...(process.env.GOOGLE_SERVICES_JSON
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
        : {}),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#5C4033',
          sounds: [],
          enableBackgroundRemoteNotifications: true,
        },
      ],
    ],
    extra: {
      apiUrl,
      eas: {
        projectId: easProjectId,
      },
    },
  },
};
