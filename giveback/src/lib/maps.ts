import Constants from 'expo-constants';
import { Platform } from 'react-native';

// iOS draws Apple Maps with no setup. Android draws Google Maps, which needs
// an API key in the build (GOOGLE_MAPS_ANDROID_KEY); without one the app
// shows lists and "open in Google Maps" links instead of an in-app map.
export const inAppMaps =
  Platform.OS === 'ios' || (Platform.OS === 'android' && Constants.expoConfig?.extra?.androidMaps === true);
