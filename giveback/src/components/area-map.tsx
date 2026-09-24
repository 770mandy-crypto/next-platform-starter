// Native: a small map with a soft circle over the approximate area. The exact
// point is never shown — the circle is centred on the jittered location.
import { Linking, View } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

import { colors, radius } from '@/theme';

export function AreaMap({ lat, lng, height = 180 }: { lat: number; lng: number; height?: number }) {
  return (
    <View style={{ height, borderRadius: radius.lg, overflow: 'hidden' }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)}>
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
