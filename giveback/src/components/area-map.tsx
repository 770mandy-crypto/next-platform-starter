// Native: a small map with a soft circle over the approximate area. The exact
// point is never shown — the circle is centred on the jittered location.
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, View } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

import { inAppMaps } from '@/lib/maps';
import { colors, radius, space } from '@/theme';

import { Text } from './ui';

export function AreaMap({ lat, lng, height = 180 }: { lat: number; lng: number; height?: number }) {
  const open = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  if (!inAppMaps) {
    return (
      <Pressable
        onPress={open}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.primarySoft,
        }}>
        <Ionicons name="map" size={26} color={colors.primary} />
        <Text weight="bold" color={colors.primaryDark} style={{ flex: 1 }}>
          הצגת האזור ב-Google Maps
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: 'hidden' }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={open}>
        <Circle
          center={{ latitude: lat, longitude: lng }}
          radius={500}
          fillColor="rgba(19,122,79,0.18)"
          strokeColor={colors.primary}
          strokeWidth={2}
        />
      </MapView>
    </View>
  );
}
