import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Chip, EmptyState, Field, IconButton, Loading, Row, Text } from '@/components/ui';
import {
  blockUser,
  getConversation,
  getItem,
  getPrivateAddress,
  getProfile,
  hasThanked,
  isBlocked,
  listMessages,
  markRead,
  sendMessage,
  sendThanks,
  setItemStatus,
  shareAddress,
  unblockUser,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { googleMapsLink, wazeLink } from '@/lib/geo';
import { geocode } from '@/lib/location';
import { photoUrl, supabase } from '@/lib/supabase';
import { clockTime } from '@/lib/time';
import type { Message } from '@/lib/types';
import { colors, fonts, noOutline, radius, space } from '@/theme';

const QUICK_TAKER = ['מתי נוח לך?', 'אני יכול/ה לבוא היום בערב', 'אני בדרך 🚗', 'תודה רבה!'];
const QUICK_GIVER = ['מתי נוח לך לבוא?', 'זה ליד הדלת, אפשר לאסוף', 'עדיין זמין 👍'];

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<Message>>(null);

  const { data: conv, isLoading } = useQuery({ queryKey: ['conversation', id], queryFn: () => getConversation(id) });
  const { data: item, refetch: refetchItem } = useQuery({
    queryKey: ['item', conv?.item_id],
    queryFn: () => getItem(conv!.item_id),
    enabled: !!conv,
  });
  const otherId = conv ? (conv.owner_id === userId ? conv.requester_id : conv.owner_id) : null;
  const { data: other } = useQuery({
    queryKey: ['profile', otherId],
    queryFn: () => getProfile(otherId!),
    enabled: !!otherId,
  });
  const { data: blocked = false, refetch: refetchBlocked } = useQuery({
    queryKey: ['blocked', otherId],
    queryFn: () => isBlocked(userId!, otherId!),
    enabled: !!otherId && !!userId,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);

  const load = useCallback(async () => {
    setMessages(await listMessages(id));
    await markRead(id);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [id, queryClient]);

  useEffect(() => {
    let active = true;
    listMessages(id)
      .then((all) => active && setMessages(all))
      .then(() => markRead(id))
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch((e) => active && setError((e as Error).message));
    // Live: new messages from the other side arrive over Supabase Realtime.
    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((all) => (all.some((m) => m.id === msg.id) ? all : [...all, msg]));
          if (msg.kind === 'system') refetchItem();
          markRead(id).then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id, queryClient, refetchItem]);

  // Web and some Android versions drop realtime when backgrounded; poll gently
  // as a safety net.
  useEffect(() => {
    const t = setInterval(() => load().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [load]);

  const append = (msg: Message) => setMessages((all) => (all.some((m) => m.id === msg.id) ? all : [...all, msg]));

  async function send(body = text) {
    if (!body.trim() || !userId) return;
    setSending(true);
    setError(null);
    try {
      append(await sendMessage(id, userId, body));
      if (body === text) setText('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <Loading />;
  if (!conv || !userId) return <EmptyState icon="chatbubble-outline" title="השיחה לא נמצאה" />;

  const offer = item?.kind !== 'wanted';
  const iAmOwner = conv.owner_id === userId;
  const iAmGiver = offer ? iAmOwner : !iAmOwner;
  const closed = item?.status === 'given' || item?.status === 'removed';
  const iReceived = item?.status === 'given' && ((offer && item.given_to === userId) || (!offer && iAmOwner));

  async function changeStatus(status: 'reserved' | 'given') {
    if (!item) return;
    setError(null);
    try {
      await setItemStatus(item.id, status, otherId);
      await refetchItem();
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function openMenu() {
    const toggleBlock = async () => {
      if (blocked) await unblockUser(userId!, otherId!);
      else await blockUser(userId!, otherId!);
      refetchBlocked();
    };
    const report = () => router.push({ pathname: '/report', params: { userId: otherId!, conversationId: id } });
    const blockLabel = blocked ? 'ביטול חסימה' : 'חסימה';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['ביטול', 'דיווח', blockLabel], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        (i) => (i === 1 ? report() : i === 2 ? toggleBlock() : undefined),
      );
    } else if (Platform.OS === 'web') {
      if (window.confirm(`${blockLabel} של ${other?.display_name ?? ''}? (ביטול = דיווח)`)) toggleBlock();
      else report();
    } else {
      Alert.alert(other?.display_name ?? '', undefined, [
        { text: 'דיווח', onPress: report },
        { text: blockLabel, style: 'destructive', onPress: toggleBlock },
        { text: 'ביטול', style: 'cancel' },
      ]);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable
              onPress={() => otherId && router.push(`/user/${otherId}`)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Avatar uri={other?.avatar_url} name={other?.display_name} size={32} />
              <View>
                <Text weight="bold">{other?.display_name ?? ''}</Text>
                <Text variant="caption" color={colors.muted} numberOfLines={1}>
                  {item?.title ?? ''}
                </Text>
              </View>
            </Pressable>
          ),
          headerRight: () => <IconButton icon="ellipsis-vertical" label="אפשרויות" onPress={openMenu} />,
        }}
      />

      {item && (
        <Pressable
          onPress={() => router.push(`/item/${item.id}`)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            paddingHorizontal: space.lg,
            paddingVertical: space.sm,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}>
          {item.photos[0] ? (
            <Image
              source={{ uri: photoUrl(item.photos[0]) }}
              style={{ width: 36, height: 36, borderRadius: radius.sm }}
              contentFit="cover"
            />
          ) : (
            <Ionicons name={offer ? 'gift-outline' : 'hand-left-outline'} size={18} color={colors.primary} />
          )}
          <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
            {iAmGiver ? 'את/ה מוסר/ת' : 'את/ה מקבל/ת'} · {item.title} · {item.area_label}
          </Text>
          <Text variant="caption" weight="bold" color={item.status === 'available' ? colors.primary : colors.warning}>
            {item.status === 'available'
              ? 'זמין'
              : item.status === 'reserved'
                ? 'שמור'
                : item.status === 'given'
                  ? 'נמסר'
                  : 'הוסר'}
          </Text>
        </Pressable>
      )}

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, maxWidth: 760, width: '100%', alignSelf: 'center' }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: m }) => <Bubble message={m} mine={m.sender_id === userId} />}
        ListFooterComponent={
          iReceived && item && otherId ? (
            <ThanksCard itemId={item.id} fromId={userId} toId={otherId} toName={other?.display_name ?? ''} />
          ) : null
        }
      />

      {blocked ? (
        <View
          style={{ padding: space.lg, paddingBottom: Math.max(insets.bottom, space.lg), backgroundColor: colors.card }}>
          <Text color={colors.muted} style={{ textAlign: 'center' }}>
            חסמת את {other?.display_name}. אפשר לבטל בתפריט למעלה.
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: space.sm,
            paddingBottom: Math.max(insets.bottom, space.sm),
            gap: space.sm,
          }}>
          {!closed && iAmGiver && (
            <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
              {addressOpen ? (
                <AddressForm
                  conversationId={id}
                  itemId={offer ? item?.id : undefined}
                  city={item?.city ?? ''}
                  onSent={(msg) => {
                    append(msg);
                    setAddressOpen(false);
                  }}
                  onCancel={() => setAddressOpen(false)}
                />
              ) : (
                <Row>
                  <Button
                    testID="share-address"
                    style={{ flex: 1 }}
                    size="sm"
                    icon="navigate"
                    title="שליחת כתובת + Waze"
                    onPress={() => setAddressOpen(true)}
                  />
                  {offer && iAmOwner && item?.status === 'available' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      title="לשמור עבורו/ה"
                      onPress={() => changeStatus('reserved')}
                    />
                  )}
                  {offer && iAmOwner && item && (
                    <Button
                      testID="chat-mark-given"
                      size="sm"
                      variant="secondary"
                      title="נמסר ✓"
                      onPress={() => changeStatus('given')}
                    />
                  )}
                </Row>
              )}
            </View>
          )}
          {messages.length < 4 && !closed && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
              {(iAmGiver ? QUICK_GIVER : QUICK_TAKER).map((q) => (
                <Chip key={q} label={q} onPress={() => send(q)} />
              ))}
            </ScrollView>
          )}
          <Row style={{ paddingHorizontal: space.lg }}>
            <TextInput
              testID="chat-input"
              value={text}
              onChangeText={setText}
              placeholder="כתבו הודעה…"
              placeholderTextColor={colors.faint}
              multiline
              maxLength={2000}
              style={[
                noOutline,
                {
                  flex: 1,
                  minHeight: 44,
                  maxHeight: 120,
                  borderRadius: 22,
                  backgroundColor: colors.bg,
                  paddingHorizontal: space.lg,
                  paddingVertical: 11,
                  fontFamily: fonts.regular,
                  fontSize: 15,
                  color: colors.ink,
                  textAlign: 'right',
                },
              ]}
              onSubmitEditing={() => send()}
              blurOnSubmit={false}
              submitBehavior="submit"
            />
            <Pressable
              testID="chat-send"
              accessibilityRole="button"
              accessibilityLabel="שליחה"
              disabled={!text.trim() || sending}
              onPress={() => send()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: text.trim() ? colors.primary : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="send" size={19} color={colors.white} style={{ transform: [{ scaleX: -1 }] }} />
            </Pressable>
          </Row>
          {error && (
            <Text variant="caption" color={colors.danger} style={{ paddingHorizontal: space.lg }}>
              {error}
            </Text>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function Bubble({ message: m, mine }: { message: Message; mine: boolean }) {
  if (m.kind === 'system') {
    return (
      <View
        style={{
          alignSelf: 'center',
          backgroundColor: colors.border,
          borderRadius: radius.pill,
          paddingHorizontal: 12,
          paddingVertical: 4,
          marginVertical: 4,
        }}>
        <Text variant="caption" color={colors.muted}>
          {m.body}
        </Text>
      </View>
    );
  }
  // RTL, like Hebrew messaging apps: your messages on the left, theirs on the right.
  const side = { alignSelf: mine ? 'flex-end' : 'flex-start' } as const;
  const bg = mine ? colors.primary : colors.card;
  const fg = mine ? colors.white : colors.ink;

  if (m.kind === 'address') {
    const waze = wazeLink(m);
    const google = googleMapsLink(m);
    return (
      <View
        testID="address-card"
        style={[
          side,
          {
            maxWidth: '85%',
            width: 300,
            borderRadius: radius.lg,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.primary,
            padding: space.md,
            gap: space.sm,
          },
        ]}>
        <Row>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text weight="bold">כתובת לאיסוף</Text>
        </Row>
        <Text selectable>{m.address}</Text>
        {waze && (
          <Button
            testID="open-waze"
            variant="waze"
            icon="car"
            title="נווט עם Waze"
            onPress={() => Linking.openURL(waze)}
          />
        )}
        {google && (
          <Button variant="light" icon="map" title="פתח ב-Google Maps" onPress={() => Linking.openURL(google)} />
        )}
        <Text variant="caption" color={colors.faint}>
          {clockTime(m.created_at)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        side,
        {
          maxWidth: '82%',
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderBottomLeftRadius: mine ? 4 : radius.lg,
          borderBottomRightRadius: mine ? radius.lg : 4,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.border,
        },
      ]}>
      <Text color={fg} selectable>
        {m.body}
      </Text>
      <Text variant="caption" color={mine ? 'rgba(255,255,255,0.75)' : colors.faint} style={{ alignSelf: 'flex-end' }}>
        {clockTime(m.created_at)}
      </Text>
    </View>
  );
}

function AddressForm({
  conversationId,
  itemId,
  city,
  onSent,
  onCancel,
}: {
  conversationId: string;
  itemId?: string;
  city: string;
  onSent: (m: Message) => void;
  onCancel: () => void;
}) {
  const { data: stored } = useQuery({
    queryKey: ['item-private', itemId],
    queryFn: () => getPrivateAddress(itemId!),
    enabled: !!itemId,
  });
  const { profile } = useAuth();
  const [typed, setAddress] = useState<string | null>(null);
  const address = typed ?? stored?.address ?? '';
  // On a request the address is my own, so it is completed with my city,
  // not the city of the person asking.
  const myCity = itemId ? city : (profile?.city ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const same = !!stored && address.trim() === stored.address;
      const full = itemId || !myCity || address.includes(myCity) ? address.trim() : `${address.trim()}, ${myCity}`;
      // A new address is pinned on the phone so Waze lands on the door.
      const point = same ? null : await geocode(itemId ? `${full}, ${city}` : full);
      onSent(await shareAddress(conversationId, same ? null : full, point));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: space.sm, padding: space.md }}>
      <Field
        testID="pickup-address"
        label="הכתובת תישלח רק לאדם הזה"
        placeholder={itemId ? 'רחוב, מספר, קומה / כניסה' : 'רחוב, מספר ועיר'}
        value={address}
        onChangeText={setAddress}
        maxLength={160}
      />
      {error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
      <Row>
        <Button
          testID="send-address"
          style={{ flex: 1 }}
          size="sm"
          icon="send"
          title="שליחה"
          loading={busy}
          disabled={!address.trim()}
          onPress={submit}
        />
        <Button size="sm" variant="ghost" title="ביטול" onPress={onCancel} />
      </Row>
    </Card>
  );
}

function ThanksCard({
  itemId,
  fromId,
  toId,
  toName,
}: {
  itemId: string;
  fromId: string;
  toId: string;
  toName: string;
}) {
  const { data: done, refetch } = useQuery({
    queryKey: ['thanked', itemId, fromId],
    queryFn: () => hasThanked(itemId, fromId),
  });
  const [body, setBody] = useState(`תודה רבה ${toName}! 💚`);
  const [busy, setBusy] = useState(false);
  if (done) {
    return (
      <Text variant="caption" color={colors.primary} style={{ textAlign: 'center', marginTop: space.md }}>
        שלחת תודה 💚
      </Text>
    );
  }
  return (
    <Card
      style={{
        marginTop: space.md,
        gap: space.sm,
        backgroundColor: colors.primarySoft,
        borderColor: colors.primarySoft,
      }}>
      <Text weight="bold">רוצה לשלוח תודה ל{toName}?</Text>
      <Text variant="caption" color={colors.muted}>
        התודה תופיע בפרופיל שלה/ו — כך הקהילה יודעת במי אפשר לבטוח.
      </Text>
      <Field value={body} onChangeText={setBody} maxLength={500} />
      <Button
        testID="send-thanks"
        icon="heart"
        title="שליחת תודה"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await sendThanks(itemId, fromId, toId, body);
            refetch();
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}
