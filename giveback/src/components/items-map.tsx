import { router } from 'expo-router';
import { Platform, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { category } from '@/lib/catalog';
import type { Point } from '@/lib/geo';
import { inAppMaps } from '@/lib/maps';
import type { ItemCard } from '@/lib/types';
import { colors } from '@/theme';

import { ItemsListFallback } from './items-list-fallback';

export function ItemsMap({ items, center }: { items: ItemCard[]; center: Point }) {
  if (!inAppMaps) return <ItemsListFallback items={items} />;
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        // Google Maps on Android (as in the rest of Israel's apps), Apple Maps on iOS.
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }}>
        {items.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.approx_lat, longitude: item.approx_lng }}
            title={item.title}
            description={`${category(item.category).label} · ${item.area_label}`}
            pinColor={item.status === 'reserved' ? colors.warning : colors.primary}
            onCalloutPress={() => router.push(`/item/${item.id}`)}
          />
        ))}
      </MapView>
    </View>
  );
}
