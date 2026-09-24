import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaMap } from '@/components/area-map';
import { StatusBadge } from '@/components/item-card';
import { PersonPicker } from '@/components/person-picker';
import { Avatar, Badge, Button, Card, EmptyState, Field, IconButton, Loading, Row, Text } from '@/components/ui';
import {
  getItem,
  getPrivateAddress,
  getStats,
  isFavorite,
  listConversations,
  setItemStatus,
  startConversation,
  toggleFavorite,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { category, conditionLabel } from '@/lib/catalog';
import { distanceKm, formatDistance } from '@/lib/geo';
import { useOrigin } from '@/lib/location';
import { photoUrl } from '@/lib/supabase';
import { timeAgo } from '@/lib/time';
import type { ItemStatus } from '@/lib/types';
import { goBack } from '@/lib/nav';
import { colors, radius, shadow, space } from '@/theme';

export default function ItemScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { userId, requireAuth } = useAuth();
  const { origin } = useOrigin();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const photoWidth = Math.min(width, 760);

  const { data: item, isLoading, refetch } = useQuery({ queryKey: ['item', id], queryFn: () => getItem(id) });
  const isOwner = !!item && item.owner_id === userId;

  const { data: ownerStats } = useQuery({
    queryKey: ['stats', item?.owner_id],
    queryFn: () => getStats(item!.owner_id),
    enabled: !!item,
  });
  const { data: favorite = false } = useQuery({
    queryKey: ['favorite', id, userId],
    queryFn: () => isFavorite(userId!, id),
    enabled: !!userId && !isOwner,
  });
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: listConversations,
    enabled: !!userId,
  });
  const { data: priv } = useQuery({
    queryKey: ['item-private', id],
    queryFn: () => getPrivateAddress(id),
    enabled: isOwner,
  });

  const [page, setPage] = useState(0);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [picker, setPicker] = useState<null | 'reserved' | 'given'>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <Loading />;
  if (!item)
    return <EmptyState icon="alert-circle-outline" title="הפריט לא נמצא" body="ייתכן שהוסר או שהוא בקהילה פרטית." />;

  const cat = category(item.category);
  const offer = item.kind === 'offer';
  const itemConversations = conversations.filter((c) => c.item_id === item.id);
  const myConversation = !isOwner ? itemConversations[0] : undefined;
  const km = origin ? distanceKm(origin, { lat: item.approx_lat, lng: item.approx_lng }) : null;

  async function send() {
    if (!requireAuth()) return;
    setSending(true);
    setError(null);
    try {
      const cid = await startConversation(item!.id, message);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setComposing(false);
      router.push(`/chat/${cid}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: ItemStatus, recipient?: string | null) {
    setBusy(true);
    setError(null);
    try {
      await setItemStatus(item!.id, status, recipient);
      setPicker(null);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    const run = () => changeStatus('removed').then(() => goBack('/profile'));
    if (Platform.OS === 'web') return window.confirm('להסיר את הפריט?') && run();
    Alert.alert('להסיר את הפריט?', 'הוא ייעלם מהחיפוש, ומי שכתב/ה עליו יקבל/תקבל עדכון.', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'הסרה', style: 'destructive', onPress: run },
    ]);
  }

  function startCompose() {
    if (!requireAuth()) return;
    setMessage(
      offer
        ? `היי ${item!.owner_name}, ה${item!.title} עוד רלוונטי? אשמח לבוא לאסוף 🙏`
        : `היי ${item!.owner_name}, יש לי ${item!.title} בשבילך!`,
    );
    setComposing(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Row gap={0}>
              <IconButton
                icon="share-outline"
                label="שיתוף"
                onPress={() =>
                  Share.share({ message: `${item.title} למסירה ב${item.area_label} — ב-GiveBack` }).catch(() => {})
                }
              />
              {!isOwner && (
                <IconButton
                  icon="flag-outline"
                  label="דיווח"
                  onPress={() =>
                    requireAuth() &&
                    router.push({ pathname: '/report', params: { itemId: item.id, userId: item.owner_id } })
                  }
                />
              )}
            </Row>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 140, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        {fresh && isOwner && (
          <View
            style={{
              margin: space.lg,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: colors.primarySoft,
            }}>
            <Text weight="bold" color={colors.primaryDark}>
              🎉 פורסם! שכנים בסביבה כבר יכולים לראות. נעדכן אותך כשמישהו יכתוב.
            </Text>
          </View>
        )}

        {item.photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPage(Math.round(Math.abs(e.nativeEvent.contentOffset.x) / photoWidth))}>
              {item.photos.map((p) => (
                <Image
                  key={p}
                  source={{ uri: photoUrl(p) }}
                  style={{ width: photoWidth, height: photoWidth * 0.85, backgroundColor: colors.primarySoft }}
                  contentFit="cover"
                  transition={150}
                />
              ))}
            </ScrollView>
            {item.photos.length > 1 && (
              <Row style={{ position: 'absolute', bottom: 12, alignSelf: 'center' }} gap={6}>
                {item.photos.map((p, i) => (
                  <View
                    key={p}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: i === page ? colors.white : 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </Row>
            )}
          </View>
        ) : (
          <View
            style={{
              height: 180,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primarySoft,
            }}>
            <Ionicons name={offer ? cat.icon : 'hand-left-outline'} size={64} color={colors.primary} />
          </View>
        )}

        <View style={{ padding: space.lg, gap: space.lg }}>
          <View style={{ gap: space.sm }}>
            <Row style={{ flexWrap: 'wrap' }}>
              {!offer && <Badge label="מחפש/ת" tone="coral" />}
              <StatusBadge status={item.status} />
              <Badge label={cat.label} />
              {item.condition && <Badge label={conditionLabel(item.condition)} />}
              {item.community_name && <Badge label={`👥 ${item.community_name}`} tone="green" />}
            </Row>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text variant="title" style={{ flex: 1 }}>
                {item.title}
              </Text>
              {!isOwner && userId && (
                <IconButton
                  icon={favorite ? 'heart' : 'heart-outline'}
                  color={favorite ? colors.accent : colors.ink}
                  label={favorite ? 'הסרה מהשמורים' : 'שמירה'}
                  onPress={async () => {
                    await toggleFavorite(userId, item.id, !favorite);
                    queryClient.invalidateQueries({ queryKey: ['favorite', id, userId] });
                    queryClient.invalidateQueries({ queryKey: ['favorites'] });
                  }}
                />
              )}
            </Row>
            <Text color={colors.muted}>
              📍 {item.area_label}
              {km != null ? ` · ${formatDistance(km)} ממך` : ''} · {timeAgo(item.created_at)}
            </Text>
          </View>

          {!!item.description && <Text>{item.description}</Text>}

          {!!item.pickup_notes && (
            <Row style={{ alignItems: 'flex-start' }}>
              <Ionicons name="time-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1 }}>
                <Text weight="bold">איסוף: </Text>
                {item.pickup_notes}
              </Text>
            </Row>
          )}

          <Card
            onPress={() => router.push(`/user/${item.owner_id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar uri={item.owner_avatar} name={item.owner_name} size={48} />
            <View style={{ flex: 1 }}>
              <Text weight="bold">{item.owner_name}</Text>
              <Text variant="caption" color={colors.muted}>
                {ownerStats ? `מסר/ה ${ownerStats.given_count} פריטים · ${ownerStats.thanks_count} תודות` : ' '}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={colors.faint} />
          </Card>

          <View style={{ gap: space.sm }}>
            <AreaMap lat={item.approx_lat} lng={item.approx_lng} />
            <Row>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text variant="caption" color={colors.muted}>
                המפה מראה אזור בלבד. הכתובת תישלח בצ׳אט, עם ניווט ב-Waze.
              </Text>
            </Row>
          </View>

          {item.ai_assisted && (
            <Text variant="caption" color={colors.faint}>
              ✨ המודעה נוסחה בעזרת AI ואושרה על ידי המפרסם/ת
            </Text>
          )}

          {isOwner && (
            <Card style={{ gap: space.md }}>
              <Text variant="heading">ניהול הפריט</Text>
              {offer && (
                <Row style={{ alignItems: 'flex-start' }}>
                  <Ionicons name="lock-closed" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text variant="label" color={colors.muted} style={{ flex: 1 }}>
                    {priv?.address ? `כתובת פרטית: ${priv.address}` : 'לא נשמרה כתובת — תוכלו לכתוב אותה בצ׳אט.'}
                  </Text>
                </Row>
              )}
              <Text variant="label" color={colors.muted}>
                {itemConversations.length
                  ? `${itemConversations.length} אנשים כתבו על הפריט`
                  : 'עוד אף אחד לא כתב. נעדכן אותך בהתראה.'}
              </Text>
              {itemConversations.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/chat/${c.id}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Avatar uri={c.other_avatar} name={c.other_name} size={34} />
                  <Text style={{ flex: 1 }} numberOfLines={1}>
                    <Text weight="bold">{c.other_name}</Text> · {c.last_message_preview}
                  </Text>
                  {c.unread > 0 && <Badge label={`${c.unread}`} tone="coral" />}
                </Pressable>
              ))}
              {item.status !== 'given' && item.status !== 'removed' && (
                <Row style={{ flexWrap: 'wrap' }}>
                  <Button
                    testID="mark-given"
                    icon="checkmark-done"
                    title={offer ? 'נמסר!' : 'קיבלתי!'}
                    loading={busy}
                    onPress={() => (itemConversations.length ? setPicker('given') : changeStatus('given'))}
                  />
                  {item.status === 'available' && itemConversations.length > 0 && offer && (
                    <Button
                      variant="secondary"
                      icon="bookmark-outline"
                      title="שמירה למישהו"
                      onPress={() => setPicker('reserved')}
                    />
                  )}
                  {item.status === 'reserved' && (
                    <Button variant="ghost" title="החזרה לזמין" onPress={() => changeStatus('available')} />
                  )}
                </Row>
              )}
              {item.status === 'given' && (
                <Text color={colors.primaryDark} weight="bold">
                  💚 נמסר {item.given_at ? timeAgo(item.given_at) : ''}. תודה שנתת חיים שניים לחפץ!
                </Text>
              )}
              <Row>
                <Button
                  size="sm"
                  variant="ghost"
                  icon="create-outline"
                  title="עריכה"
                  onPress={() => router.push(`/item/edit/${item.id}`)}
                />
                {item.status !== 'removed' && (
                  <Button size="sm" variant="danger" icon="trash-outline" title="הסרה" onPress={remove} />
                )}
              </Row>
            </Card>
          )}
          {error && <Text color={colors.danger}>{error}</Text>}
        </View>
      </ScrollView>

      {!isOwner && item.status !== 'given' && item.status !== 'removed' && (
        <View
          style={{
            position: 'absolute',
            start: 0,
            end: 0,
            bottom: 0,
            paddingHorizontal: space.lg,
            paddingTop: space.md,
            paddingBottom: Math.max(insets.bottom, space.md),
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderColor: colors.border,
            gap: space.sm,
            ...shadow,
          }}>
          {composing ? (
            <>
              <Field
                testID="first-message"
                multiline
                value={message}
                onChangeText={setMessage}
                maxLength={1000}
                style={{ minHeight: 70 }}
              />
              <Row>
                <Button
                  testID="send-first-message"
                  style={{ flex: 1 }}
                  icon="send"
                  title="שליחה"
                  onPress={send}
                  loading={sending}
                  disabled={!message.trim()}
                />
                <Button variant="ghost" title="ביטול" onPress={() => setComposing(false)} />
              </Row>
              {error && <Text color={colors.danger}>{error}</Text>}
            </>
          ) : myConversation ? (
            <Button
              size="lg"
              icon="chatbubbles"
              title="המשך לשיחה"
              onPress={() => router.push(`/chat/${myConversation.id}`)}
            />
          ) : (
            <>
              {item.status === 'reserved' && (
                <Text variant="caption" color={colors.warning} style={{ textAlign: 'center' }}>
                  שמור כרגע למישהו אחר — אפשר עדיין לכתוב ולהיכנס לתור
                </Text>
              )}
              <Button
                testID="want-it"
                size="lg"
                icon={offer ? 'hand-right' : 'gift'}
                title={offer ? 'אני רוצה את זה' : 'יש לי את זה!'}
                onPress={startCompose}
              />
            </>
          )}
        </View>
      )}

      <PersonPicker
        visible={picker !== null}
        title={picker === 'given' ? (offer ? 'למי מסרת?' : 'ממי קיבלת?') : 'למי לשמור?'}
        people={itemConversations}
        allowNone={picker === 'given' ? (offer ? 'למישהו מחוץ לאפליקציה' : 'ממישהו מחוץ לאפליקציה') : undefined}
        onClose={() => setPicker(null)}
        onPick={(uid) => changeStatus(picker!, uid)}
      />
    </View>
  );
}
