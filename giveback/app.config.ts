import type { ExpoConfig } from 'expo/config';

// Values that differ per developer / environment come from env vars (EAS
// secrets in the cloud, .env locally), so nothing sensitive is committed.
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'il.co.giveback.app';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'GiveBack',
  slug: 'giveback',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'giveback',
  userInterfaceStyle: 'light',
  backgroundColor: '#F6F5F1',
  primaryColor: '#137A4F',
  description: 'מוסרים ומקבלים חפצים בחינם מהשכנים הכי קרובים — עם צ׳אט וניווט לאיסוף ב-Waze.',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      CFBundleDevelopmentRegion: 'he',
      CFBundleAllowMixedLocalizations: true,
      LSApplicationQueriesSchemes: ['waze', 'comgooglemaps'],
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#137A4F',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA', 'POST_NOTIFICATIONS'],
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
    name: 'GiveBack',
    shortName: 'GiveBack',
    lang: 'he',
    themeColor: '#137A4F',
    backgroundColor: '#F6F5F1',
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#137A4F', image: './assets/images/splash-icon.png', imageWidth: 120 }],
    ['expo-localization', { supportsRTL: true, forcesRTL: true, supportedLocales: ['he'] }],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'GiveBack משתמשת במיקום כדי להראות לך קודם את הפריטים הכי קרובים. המיקום המדויק שלך לא מוצג לאף אחד.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'GiveBack צריכה גישה לתמונות כדי שתוכלו לצרף תמונות לפריט שאתם מוסרים.',
        cameraPermission: 'GiveBack צריכה גישה למצלמה כדי לצלם את הפריט שאתם מוסרים.',
        microphonePermission: false,
      },
    ],
    ['expo-notifications', { color: '#137A4F' }],
    'expo-apple-authentication',
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY }],
    'expo-font',
    'expo-image',
    'expo-web-browser',
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    router: {},
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
  ...(EAS_PROJECT_ID
    ? { updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` }, runtimeVersion: { policy: 'appVersion' } }
    : {}),
};

export default config;
