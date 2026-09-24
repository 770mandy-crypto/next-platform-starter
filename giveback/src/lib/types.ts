// Row shapes returned by the database functions and views
// (supabase/migrations). Kept by hand; small enough not to need codegen.

export type ItemKind = 'offer' | 'wanted';
export type ItemStatus = 'available' | 'reserved' | 'given' | 'removed';
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  city: string | null;
  onboarded: boolean;
  created_at: string;
};

export type ItemCard = {
  id: string;
  kind: ItemKind;
  title: string;
  description: string;
  category: string;
  condition: ItemCondition | null;
  status: ItemStatus;
  city: string;
  area_label: string;
  pickup_notes?: string;
  photos: string[];
  created_at: string;
  given_at?: string | null;
  owner_id: string;
  owner_name: string;
  owner_avatar: string | null;
  community_id: string | null;
  community_name: string | null;
  reserved_for?: string | null;
  given_to?: string | null;
  ai_assisted?: boolean;
  approx_lat: number;
  approx_lng: number;
  distance_km?: number | null;
  is_favorite?: boolean;
};

export type Conversation = {
  id: string;
  item_id: string;
  item_title: string;
  item_photo: string | null;
  item_status: ItemStatus;
  item_kind: ItemKind;
  role: 'giver' | 'taker';
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message_at: string;
  last_message_preview: string;
  last_sender_id: string | null;
  unread: number;
};

export type ConversationRow = {
  id: string;
  item_id: string;
  owner_id: string;
  requester_id: string;
};

export type Message = {
  id: number;
  conversation_id: string;
  sender_id: string | null;
  kind: 'text' | 'address' | 'system';
  body: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export type Community = {
  id: string;
  name: string;
  description: string;
  kind: string;
  city: string | null;
  is_private: boolean;
  member_count: number;
  active_items: number;
  distance_km: number | null;
  is_member: boolean;
  parent_id: string | null;
  parent_name: string | null;
  sub_count: number;
};

export type CommunityMessage = {
  id: number;
  community_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Notification = {
  id: number;
  kind: 'message' | 'alert' | 'thanks' | 'status' | 'community';
  title: string;
  body: string;
  data: { item_id?: string; conversation_id?: string; from_id?: string };
  read_at: string | null;
  created_at: string;
};

export type Alert = {
  id: string;
  query: string;
  category: string | null;
  radius_km: number;
  label: string;
  created_at: string;
};

export type Thanks = {
  id: number;
  item_id: string;
  from_id: string;
  to_id: string;
  body: string;
  created_at: string;
};

export type ProfileStats = {
  given_count: number;
  received_count: number;
  thanks_count: number;
  active_count: number;
};

export type AiListing = {
  title: string;
  category: string;
  condition: ItemCondition;
  description: string;
  allowed: boolean;
  moderation_reason: string;
};
