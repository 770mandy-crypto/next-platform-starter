import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityPicker } from '@/components/city-picker';
import { ItemCard } from '@/components/item-card';
import { Button, Chip, EmptyState, IconButton, Loading, Row, Segmented, Text } from '@/components/ui';
import { PAGE_SIZE, searchItems, unreadNotificationCount } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CATEGORIES, RADII } from '@/lib/catalog';
import { useOrigin } from '@/lib/location';
import type { ItemKind } from '@/lib/types';
import { colors, fonts, noOutline, radius, space } from '@/theme';

const MAX_WIDTH = 760;

export default function Discover() {
  const { userId } = useAuth();
  const { origin, locate, chooseCity, locating, error: locationError } = useOrigin();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState<ItemKind>('offer');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(5);

  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_WIDTH);
  const columns = contentWidth > 560 ? 3 : 2;
  const cardWidth = (contentWidth - space.lg * 2 - space.md * (columns - 1)) / columns;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const params = useMemo(
    () => ({ origin, radiusKm, query: debounced, category: categoryId, kind }),
    [origin, radiusKm, debounced, categoryId, kind],
  );

  const feed = useInfiniteQuery({
    queryKey: ['search', params],
    queryFn: ({ pageParam }) => searchItems(params, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === PAGE_SIZE ? all.length : undefined),
  });
  const items = feed.data?.pages.flat() ?? [];

  const { data: unread = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: unreadNotificationCount,
    enabled: !!userId,
  });

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Text variant="display" color={colors.primary} style={{ fontSize: 26 }}>
            GiveBack
          </Text>
          <Pressable
            testID="location-pill"
            accessibilityRole="button"
            onPress={() => setPickerOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location" size={15} color={colors.primary} />
            <Text variant="label" weight="bold">
              {origin ? origin.label : 'בחרו מיקום'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.muted} />
          </Pressable>
        </View>
        <Row gap={0}>
          <IconButton icon="people-outline" label="קהילות" onPress={() => router.push('/communities')} />
          <IconButton
            icon="notifications-outline"
            label="עדכונים"
            badge={unread}
            onPress={() => (userId ? router.push('/notifications') : router.push('/sign-in'))}
          />
        </Row>
      </Row>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          backgroundColor: colors.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: space.md,
          height: 48,
        }}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <SearchInput value={query} onChange={setQuery} />
        {!!query && (
          <Pressable accessibilityLabel="ניקוי" onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.faint} />
          </Pressable>
        )}
      </View>

      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { value: 'offer', label: 'מוסרים בחינם' },
          { value: 'wanted', label: 'מחפשים' },
        ]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label="הכל" selected={!categoryId} onPress={() => setCategoryId(null)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.icon}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      {origin ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {RADII.map((r) => (
            <Chip key={r} label={`עד ${r} ק״מ`} selected={radiusKm === r} onPress={() => setRadiusKm(r)} />
          ))}
          <Chip label="כל הארץ" selected={radiusKm === null} onPress={() => setRadiusKm(null)} />
        </ScrollView>
      ) : (
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={{
            flexDirection: 'row',
            gap: space.md,
            alignItems: 'center',
            padding: space.md,
            borderRadius: radius.md,
            backgroundColor: colors.primarySoft,
          }}>
          <Ionicons name="navigate-circle" size={30} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text weight="bold">מה יש ליד הבית?</Text>
            <Text variant="caption" color={colors.muted}>
              שתפו מיקום או בחרו עיר — ונראה לכם קודם את הכי קרוב.
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        key={columns}
        data={items}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        style={{ alignSelf: 'center', width: contentWidth }}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        columnWrapperStyle={{ gap: space.md }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ItemCard item={item} width={cardWidth} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          feed.isLoading ? (
            <Loading />
          ) : feed.isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="לא הצלחנו לטעון"
              body={(feed.error as Error).message}
              action={<Button title="נסו שוב" onPress={() => feed.refetch()} />}
            />
          ) : (
            <EmptyState
              icon={kind === 'offer' ? 'gift-outline' : 'hand-left-outline'}
              title={debounced ? `עוד אין "${debounced}" בסביבה` : 'עוד אין כאן פריטים'}
              body={kind === 'offer' ? 'נגדיל את המרחק, או שנודיע לכם ברגע שמישהו יפרסם?' : 'אפשר להיות הראשונים לבקש.'}
              action={
                <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
                  {kind === 'offer' && (
                    <Button
                      icon="notifications"
                      title="תודיעו לי כשזה יתפרסם"
                      onPress={() =>
                        userId
                          ? router.push({
                              pathname: '/alerts',
                              params: { query: debounced, category: categoryId ?? '' },
                            })
                          : router.push('/sign-in')
                      }
                    />
                  )}
                  <Button
                    variant="secondary"
                    icon="add-circle-outline"
                    title={kind === 'offer' ? 'יש לי משהו למסור' : 'לפרסם בקשה'}
                    onPress={() => router.push({ pathname: '/post', params: { kind } })}
                  />
                </View>
              }
            />
          )
        }
        ListFooterComponent={feed.isFetchingNextPage ? <Loading /> : null}
      />
      <CityPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={chooseCity}
        locating={locating}
        error={locationError}
        onUseGps={async () => {
          if (await locate()) setPickerOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      testID="search-input"
      value={value}
      onChangeText={onChange}
      placeholder="מה מחפשים? שידה, עגלה, ספרים…"
      placeholderTextColor={colors.faint}
      returnKeyType="search"
      style={[
        { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, textAlign: 'right', height: '100%' },
        noOutline,
      ]}
    />
  );
}
