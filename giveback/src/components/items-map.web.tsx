// The web build has no native map; it shows the nearby list with a link out
// to Google Maps for each area instead.
import { router } from 'expo-router';
import { FlatList, Pressable } from 'react-native';

import { category } from '@/lib/catalog';
import { formatDistance, type Point } from '@/lib/geo';
import type { ItemCard } from '@/lib/types';
import { colors, space } from '@/theme';

import { Divider, Text } from './ui';

export function ItemsMap({ items }: { items: ItemCard[]; center: Point }) {
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      ItemSeparatorComponent={Divider}
      ListHeaderComponent={
        <Text color={colors.muted} style={{ padding: space.lg }}>
          המפה האינטראקטיבית זמינה באפליקציה. כאן — כל מה שבסביבה, מהקרוב לרחוק.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/item/${item.id}`)}
          style={{ padding: space.lg, backgroundColor: colors.card, gap: 2 }}>
          <Text weight="bold">{item.title}</Text>
          <Text variant="caption" color={colors.muted}>
            {category(item.category).label} · {item.area_label} · {formatDistance(item.distance_km)}
          </Text>
        </Pressable>
      )}
    />
  );
}
