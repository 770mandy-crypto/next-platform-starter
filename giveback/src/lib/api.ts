// Typed calls into the database. Screens use these through React Query.

import type { Point } from './geo';
import { supabase, unwrap } from './supabase';
import type {
  AiListing,
  Alert,
  Community,
  CommunityMessage,
  Conversation,
  ConversationRow,
  ItemCard,
  ItemCondition,
  ItemKind,
  ItemStatus,
  Message,
  Notification,
  Profile,
  ProfileStats,
  Thanks,
} from './types';

export const PAGE_SIZE = 20;

export type SearchParams = {
  origin: Point | null;
  radiusKm: number | null;
  query: string;
  category: string | null;
  kind: ItemKind;
  communityId?: string | null;
};

export async function searchItems(p: SearchParams, page = 0, limit = PAGE_SIZE) {
  return unwrap(
    await supabase.rpc('search_items', {
      p_lat: p.origin?.lat ?? null,
      p_lng: p.origin?.lng ?? null,
      p_radius_km: p.origin ? p.radiusKm : null,
      p_query: p.query,
      p_category: p.category,
      p_kind: p.kind,
      p_community_id: p.communityId ?? null,
      p_limit: limit,
      p_offset: page * limit,
    }),
  ) as ItemCard[];
}

export async function getItem(id: string) {
  return unwrap(await supabase.from('item_cards').select('*').eq('id', id).maybeSingle()) as ItemCard | null;
}

export async function getPrivateAddress(id: string) {
  const row = unwrap(
    await supabase.from('item_private').select('address, precise').eq('item_id', id).maybeSingle(),
  ) as { address: string; precise: boolean } | null;
  return row;
}

export async function listUserItems(userId: string, statuses: ItemStatus[]) {
  return unwrap(
    await supabase
      .from('item_cards')
      .select('*')
      .eq('owner_id', userId)
      .in('status', statuses)
      .order('created_at', { ascending: false }),
  ) as ItemCard[];
}

export type NewItem = {
  kind: ItemKind;
  title: string;
  description: string;
  category: string;
  condition: ItemCondition | null;
  location: Point;
  precise: boolean;
  city: string;
  areaLabel: string;
  address: string;
  pickupNotes: string;
  communityId: string | null;
  photos: string[];
  aiAssisted: boolean;
};

export async function createItem(item: NewItem) {
  return unwrap(
    await supabase
      .rpc('create_item', {
        p_title: item.title,
        p_category: item.category,
        p_lat: item.location.lat,
        p_lng: item.location.lng,
        p_city: item.city,
        p_kind: item.kind,
        p_description: item.description,
        p_condition: item.condition,
        p_area_label: item.areaLabel,
        p_address: item.address,
        p_precise: item.precise,
        p_pickup_notes: item.pickupNotes,
        p_community_id: item.communityId,
        p_photos: item.photos,
        p_ai_assisted: item.aiAssisted,
      })
      .single(),
  ) as { id: string };
}

export async function updateItem(
  id: string,
  fields: Partial<Pick<ItemCard, 'title' | 'description' | 'category' | 'condition' | 'pickup_notes' | 'photos'>>,
) {
  unwrap(await supabase.from('items').update(fields).eq('id', id));
}

export async function setItemStatus(id: string, status: ItemStatus, recipient?: string | null) {
  unwrap(await supabase.rpc('set_item_status', { p_item_id: id, p_status: status, p_recipient: recipient ?? null }));
}

export async function toggleFavorite(userId: string, itemId: string, on: boolean) {
  if (on) unwrap(await supabase.from('favorites').upsert({ user_id: userId, item_id: itemId }));
  else unwrap(await supabase.from('favorites').delete().eq('user_id', userId).eq('item_id', itemId));
}

export async function listFavorites(userId: string) {
  const rows = unwrap(
    await supabase.from('favorites').select('item_id').eq('user_id', userId).order('created_at', { ascending: false }),
  ) as { item_id: string }[];
  if (!rows.length) return [];
  const items = unwrap(
    await supabase
      .from('item_cards')
      .select('*')
      .in(
        'id',
        rows.map((r) => r.item_id),
      ),
  ) as ItemCard[];
  return items.filter((i) => i.status !== 'removed');
}

export async function isFavorite(userId: string, itemId: string) {
  const { count } = await supabase
    .from('favorites')
    .select('item_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('item_id', itemId);
  return (count ?? 0) > 0;
}

export async function describePhoto(base64: string) {
  const { data, error } = await supabase.functions.invoke('ai-listing', { body: { image: base64 } });
  if (error) {
    let message = 'המילוי האוטומטי לא זמין כרגע';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  return data as AiListing;
}

// Chat

export async function startConversation(itemId: string, body: string) {
  return unwrap(await supabase.rpc('start_conversation', { p_item_id: itemId, p_body: body })) as string;
}

export async function listConversations() {
  return unwrap(await supabase.rpc('list_conversations')) as Conversation[];
}

export async function getConversation(id: string) {
  return unwrap(
    await supabase.from('conversations').select('id, item_id, owner_id, requester_id').eq('id', id).maybeSingle(),
  ) as ConversationRow | null;
}

export async function listMessages(conversationId: string) {
  return unwrap(
    await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('id', { ascending: true })
      .limit(500),
  ) as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  return unwrap(
    await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
      .select()
      .single(),
  ) as Message;
}

export async function shareAddress(conversationId: string, address: string | null, point: Point | null) {
  return unwrap(
    await supabase
      .rpc('share_pickup_address', {
        p_conversation_id: conversationId,
        p_address: address,
        p_lat: point?.lat ?? null,
        p_lng: point?.lng ?? null,
      })
      .single(),
  ) as Message;
}

export async function markRead(conversationId: string) {
  await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
}

// People

export async function getProfile(id: string) {
  return unwrap(await supabase.from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null;
}

export async function updateProfile(
  id: string,
  fields: Partial<Pick<Profile, 'display_name' | 'bio' | 'city' | 'onboarded'>>,
) {
  unwrap(await supabase.from('profiles').update(fields).eq('id', id));
}

export async function getStats(id: string) {
  return unwrap(await supabase.rpc('get_profile_stats', { p_user_id: id }).single()) as ProfileStats;
}

export async function listThanks(toId: string) {
  const rows = unwrap(
    await supabase.from('thanks').select('*').eq('to_id', toId).order('created_at', { ascending: false }).limit(30),
  ) as Thanks[];
  const ids = [...new Set(rows.map((t) => t.from_id))];
  const people = ids.length
    ? (unwrap(await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids)) as Profile[])
    : [];
  return rows.map((t) => ({ ...t, from: people.find((p) => p.id === t.from_id) }));
}

export async function sendThanks(itemId: string, fromId: string, toId: string, body: string) {
  unwrap(await supabase.from('thanks').insert({ item_id: itemId, from_id: fromId, to_id: toId, body: body.trim() }));
}

export async function hasThanked(itemId: string, fromId: string) {
  const { count } = await supabase
    .from('thanks')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', itemId)
    .eq('from_id', fromId);
  return (count ?? 0) > 0;
}

export async function blockUser(me: string, other: string) {
  unwrap(await supabase.from('blocks').upsert({ blocker_id: me, blocked_id: other }));
}

export async function unblockUser(me: string, other: string) {
  unwrap(await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', other));
}

export async function isBlocked(me: string, other: string) {
  const { count } = await supabase
    .from('blocks')
    .select('blocked_id', { count: 'exact', head: true })
    .eq('blocker_id', me)
    .eq('blocked_id', other);
  return (count ?? 0) > 0;
}

export async function report(fields: {
  reason: string;
  details: string;
  itemId?: string | null;
  userId?: string | null;
  conversationId?: string | null;
}) {
  unwrap(
    await supabase.from('reports').insert({
      reason: fields.reason,
      details: fields.details,
      item_id: fields.itemId ?? null,
      reported_user_id: fields.userId ?? null,
      conversation_id: fields.conversationId ?? null,
    }),
  );
}

export async function deleteAccount(userId: string) {
  // Photos first: the database cannot delete Storage objects itself.
  const { data: files } = await supabase.storage.from('item-photos').list(userId, { limit: 1000 });
  if (files?.length) await supabase.storage.from('item-photos').remove(files.map((f) => `${userId}/${f.name}`));
  unwrap(await supabase.rpc('delete_my_account'));
  await supabase.auth.signOut();
}

// Communities

export async function listCommunities(origin: Point | null, query = '', parentId: string | null = null) {
  return unwrap(
    await supabase.rpc('communities_nearby', {
      p_lat: origin?.lat ?? null,
      p_lng: origin?.lng ?? null,
      p_query: query,
      p_parent_id: parentId,
    }),
  ) as Community[];
}

export async function getCommunity(id: string, origin: Point | null) {
  const all = await listCommunities(origin);
  const hit = all.find((c) => c.id === id);
  if (hit) return hit;
  const row = unwrap(await supabase.from('communities').select('*').eq('id', id).maybeSingle()) as Community | null;
  return row
    ? { ...row, member_count: 0, active_items: 0, distance_km: null, is_member: false, parent_name: null, sub_count: 0 }
    : null;
}

export async function createCommunity(fields: {
  name: string;
  description: string;
  kind: string;
  city: string | null;
  point: Point | null;
  isPrivate: boolean;
  parentId?: string | null;
}) {
  return unwrap(
    await supabase
      .rpc('create_community', {
        p_name: fields.name,
        p_lat: fields.point?.lat ?? null,
        p_lng: fields.point?.lng ?? null,
        p_city: fields.city,
        p_parent_id: fields.parentId ?? null,
        p_description: fields.description,
        p_kind: fields.kind,
        p_is_private: fields.isPrivate,
      })
      .single(),
  ) as { id: string };
}

export async function joinCommunity(id: string | null, code?: string) {
  return unwrap(await supabase.rpc('join_community', { p_community_id: id, p_invite_code: code ?? null })) as string;
}

export async function leaveCommunity(id: string, userId: string) {
  unwrap(await supabase.from('community_members').delete().eq('community_id', id).eq('user_id', userId));
}

export async function listCommunityMessages(communityId: string) {
  const rows = unwrap(
    await supabase
      .from('community_messages')
      .select('*')
      .eq('community_id', communityId)
      .order('id', { ascending: false })
      .limit(200),
  ) as CommunityMessage[];
  return rows.reverse();
}

export async function sendCommunityMessage(communityId: string, senderId: string, body: string) {
  return unwrap(
    await supabase
      .from('community_messages')
      .insert({ community_id: communityId, sender_id: senderId, body: body.trim() })
      .select()
      .single(),
  ) as CommunityMessage;
}

export async function getProfiles(ids: string[]) {
  if (!ids.length) return [];
  return unwrap(await supabase.from('profiles').select('*').in('id', ids)) as Profile[];
}

export async function inviteCode(id: string) {
  return unwrap(await supabase.rpc('get_invite_code', { p_community_id: id })) as string | null;
}

// Alerts & notifications

export async function listAlerts() {
  return unwrap(await supabase.from('alerts').select('*').order('created_at', { ascending: false })) as Alert[];
}

export async function createAlert(
  userId: string,
  a: { query: string; category: string | null; radiusKm: number; center: Point; label: string },
) {
  unwrap(
    await supabase.from('alerts').insert({
      user_id: userId,
      query: a.query.trim(),
      category: a.category,
      radius_km: a.radiusKm,
      center: `SRID=4326;POINT(${a.center.lng} ${a.center.lat})`,
      label: a.label,
    }),
  );
}

export async function deleteAlert(id: string) {
  unwrap(await supabase.from('alerts').delete().eq('id', id));
}

export async function listNotifications() {
  return unwrap(
    await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
  ) as Notification[];
}

export async function markAllNotificationsRead() {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}

export async function unreadNotificationCount() {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .neq('kind', 'message');
  return count ?? 0;
}

export async function registerPushToken(token: string, platform: string) {
  await supabase.rpc('register_push_token', { p_token: token, p_platform: platform });
}
