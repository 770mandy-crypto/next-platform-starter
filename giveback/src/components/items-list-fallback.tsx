// Shown where an in-app map is not available (the website, or an Android
// build without a Google Maps key): the nearby items, nearest first.
import { router } from 'expo-router';
import { FlatList, Pressable } from 'react-native';

import { category } from '@/lib/catalog';
import { formatDistance } from '@/lib/geo';
import type { ItemCard } from '@/lib/types';
import { colors, space } from '@/theme';

import { Divider, Text } from './ui';

export function ItemsListFallback({ items }: { items: ItemCard[] }) {
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      ItemSeparatorComponent={Divider}
      ListHeaderComponent={
        <Text color={colors.muted} style={{ padding: space.lg }}>
          כל מה שבסביבה, מהקרוב לרחוק.
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
