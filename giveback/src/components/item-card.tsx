import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { category } from '@/lib/catalog';
import { formatDistance } from '@/lib/geo';
import { photoUrl } from '@/lib/supabase';
import { timeAgo } from '@/lib/time';
import type { ItemCard as Item, ItemStatus } from '@/lib/types';
import { colors, radius, space } from '@/theme';

import { Badge, Text } from './ui';

export function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'reserved') return <Badge label="שמור" tone="yellow" />;
  if (status === 'given') return <Badge label="נמסר 💚" tone="green" />;
  if (status === 'removed') return <Badge label="הוסר" tone="red" />;
  return null;
}

export function ItemCard({ item, width }: { item: Item; width: number }) {
  const cat = category(item.category);
  const photo = photoUrl(item.photos[0]);
  return (
    <Pressable
      testID={`item-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.area_label}${item.distance_km != null ? `, ${formatDistance(item.distance_km)}` : ''}`}
      onPress={() => router.push(`/item/${item.id}`)}
      style={({ pressed }) => ({
        width,
        borderRadius: radius.lg,
        backgroundColor: colors.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.primarySoft }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={150}
            recyclingKey={item.id}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={cat.icon} size={44} color={colors.primary} />
          </View>
        )}
        {item.distance_km != null && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              start: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: 'rgba(255,255,255,0.94)',
              borderRadius: radius.pill,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}>
            <Ionicons name="location" size={12} color={colors.primary} />
            <Text variant="caption" weight="bold">
              {formatDistance(item.distance_km)}
            </Text>
          </View>
        )}
        {item.status !== 'available' && (
          <View style={{ position: 'absolute', bottom: 8, start: 8 }}>
            <StatusBadge status={item.status} />
          </View>
        )}
      </View>
      <View style={{ padding: space.md, gap: 2 }}>
        <Text variant="label" weight="bold" numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="caption" color={colors.muted} numberOfLines={1}>
          {item.area_label} · {timeAgo(item.created_at)}
        </Text>
        {item.community_name && (
          <Text variant="caption" color={colors.primary} numberOfLines={1}>
            👥 {item.community_name}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
