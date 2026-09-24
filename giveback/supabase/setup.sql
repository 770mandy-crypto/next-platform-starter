-- GiveBack — full database setup. Generated from supabase/migrations by
-- scripts/make-setup-sql.sh; do not edit by hand.
-- Paste into Supabase → SQL Editor → New query → Run, once, on an empty project.

-- ===== 20260924000000_giveback.sql =====
-- GiveBack schema.
--
-- Privacy model, in one paragraph: an item's exact location and street address
-- live in item_private, readable only by the owner. Everyone else sees
-- items.approx_location — the real point moved a random 150–450 m, fixed once
-- at posting — so a listing shows the neighbourhood, never the house. The
-- address reaches another person only when the giver sends it into a chat,
-- via share_pickup_address().

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Hebrew-aware search normalisation: drop niqqud, fold final letters, keep only
-- letters and digits. Mirrored by normalize() in src/lib/search.ts.
create or replace function public.gb_normalize(t text)
returns text language sql immutable parallel safe as $$
    select trim(regexp_replace(
        translate(lower(regexp_replace(coalesce(t, ''), '[֑-ׇ]', '', 'g')), 'ךםןףץ', 'כמנפצ'),
        '[^0-9a-zא-ת]+', ' ', 'g'))
$$;

-- Search forms of one query word, so everyday Hebrew morphology still matches:
-- an attached prefix letter ("השידה" → "שידה"), and a plural or construct
-- ending ("כיסאות" → "כיסא", "עגלה" → "עגל" which also finds "עגלת").
-- Mirrored by tokenVariants() in src/lib/search.ts.
create or replace function public.gb_token_variants(w text)
returns text[] language plpgsql immutable parallel safe as $$
declare
    bases text[] := array[w];
    result text[] := array[w];
    b text;
begin
    if char_length(w) > 3 and left(w, 1) in ('ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ') then
        bases := bases || substr(w, 2);
        result := result || substr(w, 2);
    end if;
    foreach b in array bases loop
        if char_length(b) > 4 and right(b, 2) in ('ימ', 'ות') then
            result := result || left(b, -2);
        elsif char_length(b) > 3 and right(b, 1) in ('ה', 'ת') then
            result := result || left(b, -1);
        end if;
    end loop;
    return result;
end $$;

create or replace function public.gb_matches(haystack text, query text)
returns boolean language sql immutable parallel safe as $$
    select not exists (
        select 1 from unnest(string_to_array(public.gb_normalize(query), ' ')) as w
        where w <> '' and not exists (
            select 1 from unnest(public.gb_token_variants(w)) as v where haystack like '%' || v || '%'
        )
    )
$$;

create or replace function public.gb_category_label(c text)
returns text language sql immutable parallel safe as $$
    select case c
        when 'furniture' then 'רהיטים ריהוט'
        when 'toys' then 'צעצועים משחקים'
        when 'books' then 'ספרים'
        when 'home' then 'ציוד לבית מטבח'
        when 'electronics' then 'חשמל אלקטרוניקה מכשירים'
        when 'baby' then 'תינוקות ילדים'
        when 'clothing' then 'ביגוד בגדים הנעלה נעליים'
        when 'sports' then 'ספורט פנאי'
        when 'garden' then 'גינה צמחים'
        when 'food' then 'אוכל מזון'
        else 'אחר'
    end
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null check (char_length(display_name) between 2 and 40),
    avatar_url text,
    bio text not null default '' check (char_length(bio) <= 300),
    city text,
    onboarded boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();

-- Google and Apple hand us a name and picture; email sign-ups start from the
-- mailbox name and are asked to confirm it during onboarding.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    name text := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        split_part(coalesce(new.email, 'שכן/ה'), '@', 1)
    );
begin
    if char_length(name) < 2 then name := name || ' ' || 'שכן/ה'; end if;
    insert into public.profiles (id, display_name, avatar_url)
    values (
        new.id,
        left(name, 40),
        coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
    );
    return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Blocks (needed early: several policies consult it)
-- ---------------------------------------------------------------------------

create table public.blocks (
    blocker_id uuid not null references public.profiles (id) on delete cascade,
    blocked_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    check (blocker_id <> blocked_id)
);

-- True when either side blocked the other. Security definer because the
-- blocked person must not be able to read the blocks table, yet must be kept
-- out of the blocker's search results and chats.
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.blocks
        where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
    )
$$;

-- ---------------------------------------------------------------------------
-- Communities — the local, people-who-know-each-other differentiator
-- ---------------------------------------------------------------------------

create table public.communities (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 2 and 60),
    description text not null default '' check (char_length(description) <= 500),
    kind text not null default 'neighborhood'
        check (kind in ('neighborhood', 'building', 'school', 'kibbutz', 'workplace', 'other')),
    city text,
    center extensions.geography(point, 4326),
    is_private boolean not null default false,
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now()
);
create index communities_center_idx on public.communities using gist (center);

create table public.community_members (
    community_id uuid not null references public.communities (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role text not null default 'member' check (role in ('admin', 'member')),
    joined_at timestamptz not null default now(),
    primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members (user_id);

-- Invite codes are kept apart so that reading a community never reveals the
-- code that unlocks it.
create table public.community_secrets (
    community_id uuid primary key references public.communities (id) on delete cascade,
    invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6))
);

create or replace function public.is_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.community_members where community_id = cid and user_id = auth.uid())
$$;

create or replace function public.community_visible(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select cid is null or exists (
        select 1 from public.communities c
        where c.id = cid and (not c.is_private or public.is_member(cid))
    )
$$;

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------

create type public.item_kind as enum ('offer', 'wanted');
create type public.item_status as enum ('available', 'reserved', 'given', 'removed');
create type public.item_condition as enum ('new', 'like_new', 'good', 'fair');

create table public.items (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles (id) on delete cascade,
    kind public.item_kind not null default 'offer',
    title text not null check (char_length(title) between 2 and 80),
    description text not null default '' check (char_length(description) <= 2000),
    category text not null check (category in (
        'furniture', 'toys', 'books', 'home', 'electronics', 'baby', 'clothing', 'sports', 'garden', 'food', 'other'
    )),
    condition public.item_condition,
    status public.item_status not null default 'available',
    approx_location extensions.geography(point, 4326) not null,
    city text not null check (char_length(city) between 2 and 40),
    area_label text not null check (char_length(area_label) between 2 and 80),
    pickup_notes text not null default '' check (char_length(pickup_notes) <= 200),
    community_id uuid references public.communities (id) on delete set null,
    photos text[] not null default '{}' check (cardinality(photos) <= 6),
    reserved_for uuid references public.profiles (id) on delete set null,
    given_to uuid references public.profiles (id) on delete set null,
    ai_assisted boolean not null default false,
    search_text text generated always as (
        public.gb_normalize(title || ' ' || description || ' ' || area_label || ' ' || public.gb_category_label(category))
    ) stored,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    given_at timestamptz
);
create index items_location_idx on public.items using gist (approx_location);
create index items_search_idx on public.items using gin (search_text extensions.gin_trgm_ops);
create index items_status_idx on public.items (status, kind, created_at desc);
create index items_owner_idx on public.items (owner_id, created_at desc);
create index items_community_idx on public.items (community_id) where community_id is not null;
create trigger items_updated_at before update on public.items
    for each row execute function public.set_updated_at();

create table public.item_private (
    item_id uuid primary key references public.items (id) on delete cascade,
    owner_id uuid not null references public.profiles (id) on delete cascade,
    address text not null default '' check (char_length(address) <= 160),
    location extensions.geography(point, 4326) not null,
    precise boolean not null default false
);

create table public.favorites (
    user_id uuid not null references public.profiles (id) on delete cascade,
    item_id uuid not null references public.items (id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------

create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    item_id uuid not null references public.items (id) on delete cascade,
    owner_id uuid not null references public.profiles (id) on delete cascade,
    requester_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    last_message_at timestamptz not null default now(),
    last_message_preview text not null default '',
    last_sender_id uuid,
    owner_last_read_at timestamptz not null default now(),
    requester_last_read_at timestamptz not null default now(),
    unique (item_id, requester_id),
    check (owner_id <> requester_id)
);
create index conversations_owner_idx on public.conversations (owner_id, last_message_at desc);
create index conversations_requester_idx on public.conversations (requester_id, last_message_at desc);

create table public.messages (
    id bigint generated always as identity primary key,
    conversation_id uuid not null references public.conversations (id) on delete cascade,
    sender_id uuid references public.profiles (id) on delete set null,
    kind text not null default 'text' check (kind in ('text', 'address', 'system')),
    body text not null check (char_length(body) between 1 and 2000),
    address text,
    lat double precision,
    lng double precision,
    created_at timestamptz not null default clock_timestamp()
);
create index messages_conversation_idx on public.messages (conversation_id, id);

create or replace function public.is_participant(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.conversations
        where id = cid and auth.uid() in (owner_id, requester_id)
    )
$$;

-- ---------------------------------------------------------------------------
-- Gratitude, alerts, notifications, safety
-- ---------------------------------------------------------------------------

create table public.thanks (
    id bigint generated always as identity primary key,
    item_id uuid not null references public.items (id) on delete cascade,
    from_id uuid not null references public.profiles (id) on delete cascade,
    to_id uuid not null references public.profiles (id) on delete cascade,
    body text not null check (char_length(body) between 1 and 500),
    created_at timestamptz not null default now(),
    unique (item_id, from_id),
    check (from_id <> to_id)
);
create index thanks_to_idx on public.thanks (to_id, created_at desc);

-- A saved search: "tell me when a שידה shows up within 3 km".
create table public.alerts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    query text not null default '' check (char_length(query) <= 60),
    category text,
    center extensions.geography(point, 4326) not null,
    radius_km double precision not null default 3 check (radius_km between 0.5 and 50),
    label text not null default '' check (char_length(label) <= 80),
    created_at timestamptz not null default now()
);
create index alerts_center_idx on public.alerts using gist (center);

create table public.notifications (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    kind text not null check (kind in ('message', 'alert', 'thanks', 'status', 'community')),
    title text not null,
    body text not null default '',
    data jsonb not null default '{}',
    read_at timestamptz,
    created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
    token text primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    platform text not null default 'unknown',
    updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.reports (
    id bigint generated always as identity primary key,
    reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
    item_id uuid references public.items (id) on delete set null,
    reported_user_id uuid references public.profiles (id) on delete set null,
    conversation_id uuid references public.conversations (id) on delete set null,
    reason text not null check (reason in ('spam', 'scam', 'offensive', 'prohibited', 'no_show', 'other')),
    details text not null default '' check (char_length(details) <= 1000),
    status text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
    created_at timestamptz not null default now(),
    check (item_id is not null or reported_user_id is not null)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_secrets enable row level security;
alter table public.items enable row level security;
alter table public.item_private enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.thanks enable row level security;
alter table public.alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.reports enable row level security;

-- Browsing works signed out (the stores discourage forcing an account just to
-- look); everything that acts requires a signed-in user.
create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "edit own profile" on public.profiles for update to authenticated
    using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, bio, city, onboarded) on public.profiles to authenticated;

create policy "own blocks" on public.blocks for all to authenticated
    using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "visible communities" on public.communities for select to anon, authenticated
    using (not is_private or public.is_member(id));
create policy "admins edit community" on public.communities for update to authenticated
    using (exists (select 1 from public.community_members m
                   where m.community_id = id and m.user_id = auth.uid() and m.role = 'admin'));

create policy "members of visible communities" on public.community_members for select to anon, authenticated
    using (public.community_visible(community_id));
create policy "leave community" on public.community_members for delete to authenticated
    using (user_id = auth.uid());

create policy "members read invite code" on public.community_secrets for select to authenticated
    using (public.is_member(community_id));

create policy "visible items" on public.items for select to anon, authenticated
    using (owner_id = auth.uid() or (status <> 'removed' and public.community_visible(community_id)));
create policy "edit own items" on public.items for update to authenticated
    using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- Status, location and ownership change only through the functions below.
revoke update on public.items from authenticated;
grant update (title, description, category, condition, pickup_notes, photos) on public.items to authenticated;

create policy "owner reads private location" on public.item_private for select to authenticated
    using (owner_id = auth.uid());
create policy "owner edits address" on public.item_private for update to authenticated
    using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke update on public.item_private from authenticated;
grant update (address) on public.item_private to authenticated;

create policy "own favorites" on public.favorites for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "participants read conversations" on public.conversations for select to authenticated
    using (auth.uid() in (owner_id, requester_id));

create policy "participants read messages" on public.messages for select to authenticated
    using (public.is_participant(conversation_id));
create policy "participants send text" on public.messages for insert to authenticated
    with check (
        sender_id = auth.uid()
        and kind = 'text'
        and address is null and lat is null and lng is null
        and exists (
            select 1 from public.conversations c
            where c.id = conversation_id
              and auth.uid() in (c.owner_id, c.requester_id)
              and not public.is_blocked_pair(c.owner_id, c.requester_id)
        )
    );

create policy "thanks are public" on public.thanks for select to anon, authenticated using (true);
-- Only someone who took part in a completed hand-over may thank the other side.
create policy "thank after hand-over" on public.thanks for insert to authenticated
    with check (
        from_id = auth.uid()
        and exists (
            select 1 from public.conversations c
            join public.items i on i.id = c.item_id
            where c.item_id = thanks.item_id
              and i.status = 'given'
              and auth.uid() in (c.owner_id, c.requester_id)
              and thanks.to_id in (c.owner_id, c.requester_id)
        )
    );

create policy "own alerts" on public.alerts for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own notifications read" on public.notifications for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "own push tokens" on public.push_tokens for select to authenticated using (user_id = auth.uid());
create policy "delete own push tokens" on public.push_tokens for delete to authenticated using (user_id = auth.uid());

create policy "file reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "see own reports" on public.reports for select to authenticated using (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Items: create, search, status
-- ---------------------------------------------------------------------------

-- Moves a point a random 150–450 m in a random direction.
create or replace function public.jitter(lat double precision, lng double precision)
returns extensions.geography language plpgsql volatile as $$
declare
    d double precision := 150 + random() * 300;
    b double precision := random() * 2 * pi();
begin
    return extensions.st_setsrid(extensions.st_makepoint(
        lng + d * sin(b) / (111320 * cos(radians(lat))),
        lat + d * cos(b) / 110540
    ), 4326)::extensions.geography;
end $$;

create or replace function public.create_item(
    p_title text,
    p_category text,
    p_lat double precision,
    p_lng double precision,
    p_city text,
    p_kind public.item_kind default 'offer',
    p_description text default '',
    p_condition public.item_condition default null,
    p_area_label text default null,
    p_address text default '',
    p_precise boolean default false,
    p_pickup_notes text default '',
    p_community_id uuid default null,
    p_photos text[] default '{}',
    p_ai_assisted boolean default false
) returns public.items
language plpgsql security definer set search_path = public, extensions as $$
declare
    me uuid := auth.uid();
    item public.items;
    photo text;
begin
    if me is null then raise exception 'יש להתחבר' using errcode = '28000'; end if;
    if p_lat is null or p_lng is null or p_lat not between 29.3 and 33.5 or p_lng not between 34.2 and 35.95 then
        raise exception 'המיקום חייב להיות בישראל' using errcode = '22023';
    end if;
    if p_community_id is not null and not public.is_member(p_community_id) then
        raise exception 'אפשר לפרסם רק בקהילה שחברים בה' using errcode = '42501';
    end if;
    foreach photo in array coalesce(p_photos, '{}') loop
        if split_part(photo, '/', 1) <> me::text then
            raise exception 'תמונה לא תקינה' using errcode = '22023';
        end if;
    end loop;
    if (select count(*) from public.items where owner_id = me and created_at > now() - interval '1 day') >= 30 then
        raise exception 'הגעת למגבלת הפרסומים היומית' using errcode = '54000';
    end if;

    insert into public.items (
        owner_id, kind, title, description, category, condition, approx_location, city, area_label,
        pickup_notes, community_id, photos, ai_assisted
    ) values (
        me, p_kind, trim(p_title), trim(coalesce(p_description, '')), p_category,
        case when p_kind = 'offer' then coalesce(p_condition, 'good') end,
        public.jitter(p_lat, p_lng), trim(p_city), coalesce(nullif(trim(p_area_label), ''), trim(p_city)),
        trim(coalesce(p_pickup_notes, '')), p_community_id, coalesce(p_photos, '{}'), p_ai_assisted
    ) returning * into item;

    insert into public.item_private (item_id, owner_id, address, location, precise)
    values (item.id, me, trim(coalesce(p_address, '')),
            st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, coalesce(p_precise, false));

    return item;
end $$;

-- The card shape the app renders everywhere an item appears.
create or replace view public.item_cards with (security_invoker = true) as
select
    i.id, i.kind, i.title, i.description, i.category, i.condition, i.status, i.city, i.area_label,
    i.pickup_notes, i.photos, i.created_at, i.given_at, i.owner_id, i.community_id, i.reserved_for, i.given_to,
    i.ai_assisted, i.search_text,
    extensions.st_y(i.approx_location::extensions.geometry) as approx_lat,
    extensions.st_x(i.approx_location::extensions.geometry) as approx_lng,
    p.display_name as owner_name,
    p.avatar_url as owner_avatar,
    c.name as community_name
from public.items i
join public.profiles p on p.id = i.owner_id
left join public.communities c on c.id = i.community_id;

grant select on public.item_cards to anon, authenticated;

-- Nearest-first search. Runs as the caller, so the items policy decides what is
-- visible; distances are to the approximate point, so they cannot be used to
-- triangulate a house.
create or replace function public.search_items(
    p_lat double precision default null,
    p_lng double precision default null,
    p_radius_km double precision default null,
    p_query text default '',
    p_category text default null,
    p_kind public.item_kind default 'offer',
    p_community_id uuid default null,
    p_limit integer default 30,
    p_offset integer default 0
) returns table (
    id uuid, kind public.item_kind, title text, description text, category text, condition public.item_condition,
    status public.item_status, city text, area_label text, photos text[], created_at timestamptz,
    owner_id uuid, owner_name text, owner_avatar text, community_id uuid, community_name text,
    approx_lat double precision, approx_lng double precision, distance_km double precision, is_favorite boolean
)
language sql stable set search_path = public, extensions as $$
    with origin as (
        select case when p_lat is not null and p_lng is not null
            then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as g
    )
    select
        c.id, c.kind, c.title, c.description, c.category, c.condition, c.status, c.city, c.area_label, c.photos,
        c.created_at, c.owner_id, c.owner_name, c.owner_avatar, c.community_id, c.community_name,
        c.approx_lat, c.approx_lng,
        case when o.g is not null
            then st_distance(o.g, st_setsrid(st_makepoint(c.approx_lng, c.approx_lat), 4326)::geography) / 1000
        end as distance_km,
        exists (select 1 from public.favorites f where f.item_id = c.id and f.user_id = auth.uid()) as is_favorite
    from public.item_cards c
    join public.items i on i.id = c.id
    cross join origin o
    where c.status in ('available', 'reserved')
      and c.kind = p_kind
      and (p_category is null or c.category = p_category)
      and (p_community_id is null or c.community_id = p_community_id)
      and (auth.uid() is null or not public.is_blocked_pair(auth.uid(), c.owner_id))
      and (o.g is null or p_radius_km is null or st_dwithin(i.approx_location, o.g, p_radius_km * 1000))
      and public.gb_matches(c.search_text, p_query)
    order by
        (c.status = 'reserved'),
        case when o.g is not null
            then st_distance(o.g, i.approx_location) end nulls last,
        c.created_at desc
    limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
$$;

-- Owner-only status changes, announced into every chat about the item.
create or replace function public.set_item_status(
    p_item_id uuid,
    p_status public.item_status,
    p_recipient uuid default null
) returns public.items
language plpgsql security definer set search_path = public as $$
declare
    me uuid := auth.uid();
    item public.items;
    conv record;
    note text;
begin
    select * into item from public.items where id = p_item_id for update;
    if item.id is null or item.owner_id <> me then
        raise exception 'רק מי שפרסם יכול לעדכן' using errcode = '42501';
    end if;
    if p_recipient is not null and not exists (
        select 1 from public.conversations where item_id = p_item_id and requester_id = p_recipient
    ) then
        raise exception 'אפשר לבחור רק מי שכתב/ה על הפריט' using errcode = '22023';
    end if;

    update public.items set
        status = p_status,
        reserved_for = case when p_status = 'reserved' then p_recipient
                            when p_status = 'given' then coalesce(p_recipient, reserved_for) end,
        given_to = case when p_status = 'given' then coalesce(p_recipient, reserved_for) end,
        given_at = case when p_status = 'given' then now() end
    where id = p_item_id
    returning * into item;

    for conv in select * from public.conversations where item_id = p_item_id loop
        note := case
            when p_status = 'reserved' and conv.requester_id = item.reserved_for then 'הפריט נשמר עבורך 🎉 תאמו איסוף'
            when p_status = 'reserved' then 'הפריט שמור כרגע למישהו אחר. אם זה ישתנה — תקבלו הודעה'
            when p_status = 'given' and conv.requester_id = item.given_to then 'הפריט נמסר לך 💚 אפשר לשלוח תודה'
            when p_status = 'given' then 'הפריט נמסר. תודה על ההתעניינות!'
            when p_status = 'available' then 'הפריט שוב זמין 🙌'
            when p_status = 'removed' then 'הפריט הוסר על ידי המפרסם/ת'
        end;
        insert into public.messages (conversation_id, sender_id, kind, body)
        values (conv.id, me, 'system', note);
    end loop;

    return item;
end $$;

-- ---------------------------------------------------------------------------
-- Chat functions
-- ---------------------------------------------------------------------------

-- First contact about an item. Later calls reuse the same conversation.
create or replace function public.start_conversation(p_item_id uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    me uuid := auth.uid();
    item public.items;
    cid uuid;
begin
    if me is null then raise exception 'יש להתחבר' using errcode = '28000'; end if;
    select * into item from public.items where id = p_item_id;
    if item.id is null or item.status = 'removed' or not public.community_visible(item.community_id) then
        raise exception 'הפריט לא נמצא' using errcode = 'P0002';
    end if;
    if item.owner_id = me then raise exception 'זה הפריט שלך 🙂' using errcode = '22023'; end if;
    if public.is_blocked_pair(me, item.owner_id) then
        raise exception 'לא ניתן לשלוח הודעה למשתמש/ת הזה/ו' using errcode = '42501';
    end if;

    select id into cid from public.conversations where item_id = p_item_id and requester_id = me;
    if cid is null then
        if item.status = 'given' then raise exception 'הפריט כבר נמסר' using errcode = '22023'; end if;
        insert into public.conversations (item_id, owner_id, requester_id)
        values (p_item_id, item.owner_id, me) returning id into cid;
    end if;
    insert into public.messages (conversation_id, sender_id, kind, body) values (cid, me, 'text', trim(p_body));
    return cid;
end $$;

-- The giver hands over the pickup address. With no address argument the one
-- saved on the item is used, together with its exact point when it was pinned
-- precisely, so Waze lands on the door. For "wanted" posts the giver is the
-- person who answered, and types their own address (optionally with a point
-- geocoded on their phone).
create or replace function public.share_pickup_address(
    p_conversation_id uuid,
    p_address text default null,
    p_lat double precision default null,
    p_lng double precision default null
) returns public.messages
language plpgsql security definer set search_path = public, extensions as $$
declare
    me uuid := auth.uid();
    conv public.conversations;
    item public.items;
    priv public.item_private;
    giver uuid;
    addr text := nullif(trim(coalesce(p_address, '')), '');
    lat double precision := p_lat;
    lng double precision := p_lng;
    msg public.messages;
begin
    select * into conv from public.conversations where id = p_conversation_id;
    if conv.id is null or me not in (conv.owner_id, conv.requester_id) then
        raise exception 'השיחה לא נמצאה' using errcode = 'P0002';
    end if;
    select * into item from public.items where id = conv.item_id;
    giver := case when item.kind = 'offer' then conv.owner_id else conv.requester_id end;
    if me <> giver then
        raise exception 'רק מי שמוסר/ת את הפריט שולח/ת כתובת' using errcode = '42501';
    end if;
    if public.is_blocked_pair(conv.owner_id, conv.requester_id) then
        raise exception 'לא ניתן לשלוח הודעה למשתמש/ת הזה/ו' using errcode = '42501';
    end if;

    if item.kind = 'offer' then
        select * into priv from public.item_private where item_id = item.id;
        if addr is null or addr = priv.address then
            addr := nullif(priv.address, '');
            if priv.precise then
                lat := st_y(priv.location::geometry);
                lng := st_x(priv.location::geometry);
            end if;
        end if;
    end if;
    if addr is null then raise exception 'יש לכתוב כתובת' using errcode = '22023'; end if;
    if position(item.city in addr) = 0 then addr := addr || ', ' || item.city; end if;
    if lat is not null and (lat not between 29.3 and 33.5 or lng not between 34.2 and 35.95) then
        lat := null; lng := null;
    end if;

    insert into public.messages (conversation_id, sender_id, kind, body, address, lat, lng)
    values (conv.id, me, 'address', '📍 ' || addr, addr, lat, lng)
    returning * into msg;
    return msg;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql security definer set search_path = public as $$
    update public.conversations set
        owner_last_read_at = case when owner_id = auth.uid() then now() else owner_last_read_at end,
        requester_last_read_at = case when requester_id = auth.uid() then now() else requester_last_read_at end
    where id = p_conversation_id and auth.uid() in (owner_id, requester_id);
    update public.notifications set read_at = now()
    where user_id = auth.uid() and read_at is null and kind = 'message'
      and data ->> 'conversation_id' = p_conversation_id::text;
$$;

create or replace function public.list_conversations()
returns table (
    id uuid, item_id uuid, item_title text, item_photo text, item_status public.item_status, item_kind public.item_kind,
    role text, other_id uuid, other_name text, other_avatar text,
    last_message_at timestamptz, last_message_preview text, last_sender_id uuid, unread integer
)
language sql stable security invoker set search_path = public as $$
    select
        c.id, c.item_id, i.title, i.photos[1], i.status, i.kind,
        case when (i.kind = 'offer') = (c.owner_id = auth.uid()) then 'giver' else 'taker' end,
        p.id, p.display_name, p.avatar_url,
        c.last_message_at, c.last_message_preview, c.last_sender_id,
        (select count(*)::int from public.messages m
         where m.conversation_id = c.id and m.sender_id is distinct from auth.uid()
           and m.created_at > case when c.owner_id = auth.uid() then c.owner_last_read_at else c.requester_last_read_at end)
    from public.conversations c
    join public.items i on i.id = c.item_id
    join public.profiles p on p.id = case when c.owner_id = auth.uid() then c.requester_id else c.owner_id end
    where auth.uid() in (c.owner_id, c.requester_id)
    order by c.last_message_at desc
$$;

-- Keep the inbox summary current and tell the other side.
create or replace function public.on_message_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    conv public.conversations;
    recipient uuid;
    sender_name text;
    item_title text;
begin
    update public.conversations set
        last_message_at = new.created_at,
        last_message_preview = left(case when new.kind = 'address' then '📍 כתובת לאיסוף' else new.body end, 120),
        last_sender_id = new.sender_id,
        owner_last_read_at = case when owner_id = new.sender_id then new.created_at else owner_last_read_at end,
        requester_last_read_at = case when requester_id = new.sender_id then new.created_at else requester_last_read_at end
    where id = new.conversation_id
    returning * into conv;

    recipient := case when new.sender_id = conv.owner_id then conv.requester_id else conv.owner_id end;
    select display_name into sender_name from public.profiles where id = new.sender_id;
    select title into item_title from public.items where id = conv.item_id;

    insert into public.notifications (user_id, kind, title, body, data)
    values (
        recipient,
        case when new.kind = 'system' then 'status' else 'message' end,
        case when new.kind = 'system' then item_title else coalesce(sender_name, 'GiveBack') || ' · ' || item_title end,
        left(case when new.kind = 'address' then '📍 נשלחה אליך כתובת לאיסוף — לחצו לניווט' else new.body end, 180),
        jsonb_build_object('conversation_id', conv.id, 'item_id', conv.item_id)
    );
    return new;
end $$;

create trigger messages_after_insert after insert on public.messages
    for each row execute function public.on_message_inserted();

-- ---------------------------------------------------------------------------
-- Alerts: match new items against saved searches
-- ---------------------------------------------------------------------------

create or replace function public.on_item_created_match_alerts()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
    if new.kind <> 'offer' or new.status <> 'available' then return new; end if;
    insert into public.notifications (user_id, kind, title, body, data)
    select distinct on (a.user_id)
        a.user_id, 'alert',
        '🔔 ' || new.title,
        'פורסם ב' || new.area_label || ' · מתאים להתראה ' || coalesce(nullif(a.label, ''), nullif(a.query, ''), 'שלך'),
        jsonb_build_object('item_id', new.id, 'alert_id', a.id)
    from public.alerts a
    where a.user_id <> new.owner_id
      and st_dwithin(a.center, new.approx_location, a.radius_km * 1000)
      and (a.category is null or a.category = new.category)
      and not public.is_blocked_pair(a.user_id, new.owner_id)
      and (new.community_id is null
           or not (select is_private from public.communities where id = new.community_id)
           or exists (select 1 from public.community_members m
                      where m.community_id = new.community_id and m.user_id = a.user_id))
      and public.gb_matches(new.search_text, a.query);
    return new;
end $$;

create trigger items_match_alerts after insert on public.items
    for each row execute function public.on_item_created_match_alerts();

-- ---------------------------------------------------------------------------
-- Thanks, profiles, communities
-- ---------------------------------------------------------------------------

create or replace function public.on_thanks_inserted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.notifications (user_id, kind, title, body, data)
    select new.to_id, 'thanks', '💚 ' || p.display_name || ' שלח/ה לך תודה', left(new.body, 180),
           jsonb_build_object('item_id', new.item_id, 'from_id', new.from_id)
    from public.profiles p where p.id = new.from_id;
    return new;
end $$;

create trigger thanks_after_insert after insert on public.thanks
    for each row execute function public.on_thanks_inserted();

create or replace function public.get_profile_stats(p_user_id uuid)
returns table (given_count integer, received_count integer, thanks_count integer, active_count integer)
language sql stable security definer set search_path = public as $$
    select
        (select count(*)::int from public.items where owner_id = p_user_id and kind = 'offer' and status = 'given'),
        (select count(*)::int from public.items where given_to = p_user_id and kind = 'offer'),
        (select count(*)::int from public.thanks where to_id = p_user_id),
        (select count(*)::int from public.items where owner_id = p_user_id and status in ('available', 'reserved'))
$$;

create or replace function public.create_community(
    p_name text,
    p_lat double precision,
    p_lng double precision,
    p_city text default null,
    p_description text default '',
    p_kind text default 'neighborhood',
    p_is_private boolean default false
) returns public.communities
language plpgsql security definer set search_path = public, extensions as $$
declare
    me uuid := auth.uid();
    c public.communities;
begin
    if me is null then raise exception 'יש להתחבר' using errcode = '28000'; end if;
    insert into public.communities (name, description, kind, city, center, is_private, created_by)
    values (trim(p_name), trim(coalesce(p_description, '')), p_kind, p_city,
            st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_is_private, me)
    returning * into c;
    insert into public.community_members (community_id, user_id, role) values (c.id, me, 'admin');
    insert into public.community_secrets (community_id) values (c.id);
    return c;
end $$;

-- Public communities are joined by id; private ones need the invite code.
create or replace function public.join_community(p_community_id uuid default null, p_invite_code text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    me uuid := auth.uid();
    cid uuid;
begin
    if me is null then raise exception 'יש להתחבר' using errcode = '28000'; end if;
    if p_invite_code is not null and trim(p_invite_code) <> '' then
        select community_id into cid from public.community_secrets where invite_code = upper(trim(p_invite_code));
        if cid is null then raise exception 'קוד הזמנה לא נכון' using errcode = 'P0002'; end if;
    else
        select id into cid from public.communities where id = p_community_id and not is_private;
        if cid is null then raise exception 'הקהילה פרטית — צריך קוד הזמנה' using errcode = '42501'; end if;
    end if;
    insert into public.community_members (community_id, user_id) values (cid, me) on conflict do nothing;
    return cid;
end $$;

create or replace function public.communities_nearby(
    p_lat double precision default null,
    p_lng double precision default null,
    p_query text default ''
) returns table (
    id uuid, name text, description text, kind text, city text, is_private boolean,
    member_count integer, active_items integer, distance_km double precision, is_member boolean
)
language sql stable security invoker set search_path = public, extensions as $$
    select
        c.id, c.name, c.description, c.kind, c.city, c.is_private,
        (select count(*)::int from public.community_members m where m.community_id = c.id),
        (select count(*)::int from public.items i where i.community_id = c.id and i.status = 'available'),
        case when p_lat is not null and c.center is not null
            then st_distance(c.center, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000 end,
        public.is_member(c.id)
    from public.communities c
    where p_query = '' or public.gb_normalize(c.name || ' ' || coalesce(c.city, '')) like '%' || public.gb_normalize(p_query) || '%'
    order by public.is_member(c.id) desc,
        case when p_lat is not null and c.center is not null
            then st_distance(c.center, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) end nulls last,
        c.created_at desc
    limit 50
$$;

create or replace function public.get_invite_code(p_community_id uuid)
returns text
language sql stable security definer set search_path = public as $$
    select s.invite_code from public.community_secrets s
    where s.community_id = p_community_id and public.is_member(p_community_id)
$$;

-- ---------------------------------------------------------------------------
-- Push notifications, account deletion
-- ---------------------------------------------------------------------------

create or replace function public.register_push_token(p_token text, p_platform text default 'unknown')
returns void
language sql security definer set search_path = public as $$
    insert into public.push_tokens (token, user_id, platform, updated_at)
    values (p_token, auth.uid(), p_platform, now())
    on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;

-- Every notification row is also sent as a push, through the `push` edge
-- function. The function URL and a shared secret live in Vault (see README);
-- without them notifications stay in-app only, which is what local dev wants.
create or replace function public.on_notification_push()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
    url text;
    secret text;
begin
    select decrypted_secret into url from vault.decrypted_secrets where name = 'giveback_functions_url';
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'giveback_push_secret';
    if url is null or secret is null then return new; end if;
    perform net.http_post(
        url := url || '/push',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
        body := jsonb_build_object('notification', to_jsonb(new))
    );
    return new;
exception when others then
    -- A push outage must never block sending a chat message.
    return new;
end $$;

create trigger notifications_push after insert on public.notifications
    for each row execute function public.on_notification_push();

-- Required by both app stores: a user can delete their account from the app.
-- Photos are removed by the app through the Storage API first.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'יש להתחבר' using errcode = '28000'; end if;
    delete from auth.users where id = auth.uid();
end $$;

-- Functions that act for the signed-in user are not for anonymous callers.
revoke execute on function public.create_item, public.set_item_status, public.start_conversation,
    public.share_pickup_address, public.mark_conversation_read, public.list_conversations,
    public.create_community, public.join_community, public.get_invite_code, public.register_push_token,
    public.delete_my_account from public, anon;
grant execute on function public.create_item, public.set_item_status, public.start_conversation,
    public.share_pickup_address, public.mark_conversation_read, public.list_conversations,
    public.create_community, public.join_community, public.get_invite_code, public.register_push_token,
    public.delete_my_account to authenticated;

-- ---------------------------------------------------------------------------
-- Storage and realtime
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "upload own photos" on storage.objects for insert to authenticated
    with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete to authenticated
    using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

alter publication supabase_realtime add table public.messages, public.conversations, public.notifications;

-- ===== 20260925000000_photos_subcommunities_chat.sql =====
-- Photos are the listing: every offer carries at least one, and only the
-- owner's own uploads. Communities can hold sub-communities (a building
-- inside a neighbourhood) and have a members-only group chat.

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------

-- Runs on every insert and on any edit of the photo list, so neither the
-- create function nor a direct update can attach someone else's pictures or
-- leave an offer without one.
create or replace function public.items_check_photos()
returns trigger language plpgsql as $$
declare
    photo text;
begin
    if new.kind = 'offer' and cardinality(new.photos) = 0 then
        raise exception 'צריך לפחות תמונה אחת של הפריט' using errcode = '22023';
    end if;
    foreach photo in array new.photos loop
        if split_part(photo, '/', 1) <> new.owner_id::text
           or photo !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$' then
            raise exception 'תמונה לא תקינה' using errcode = '22023';
        end if;
    end loop;
    return new;
end $$;

create trigger items_check_photos before insert or update of photos, kind on public.items
    for each row execute function public.items_check_photos();

-- ---------------------------------------------------------------------------
-- Stats that count "wanted" hand-overs the right way round: on a request the
-- author receives and the person who answered gives.
-- ---------------------------------------------------------------------------

create or replace function public.get_profile_stats(p_user_id uuid)
returns table (given_count integer, received_count integer, thanks_count integer, active_count integer)
language sql stable security definer set search_path = public as $$
    select
        (select count(*)::int from public.items
         where status = 'given'
           and ((kind = 'offer' and owner_id = p_user_id) or (kind = 'wanted' and given_to = p_user_id))),
        (select count(*)::int from public.items
         where status = 'given'
           and ((kind = 'offer' and given_to = p_user_id) or (kind = 'wanted' and owner_id = p_user_id))),
        (select count(*)::int from public.thanks where to_id = p_user_id),
        (select count(*)::int from public.items where owner_id = p_user_id and status in ('available', 'reserved'))
$$;

-- ---------------------------------------------------------------------------
-- Sub-communities
-- ---------------------------------------------------------------------------

alter table public.communities
    add column parent_id uuid references public.communities (id) on delete cascade;
create index communities_parent_idx on public.communities (parent_id) where parent_id is not null;

-- A sub-community is visible only if its parent is too, so a building inside a
-- private neighbourhood group never leaks to outsiders.
create or replace function public.community_visible(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select cid is null or exists (
        select 1 from public.communities c
        where c.id = cid
          and (not c.is_private or public.is_member(c.id))
          and (c.parent_id is null or exists (
              select 1 from public.communities p
              where p.id = c.parent_id and (not p.is_private or public.is_member(p.id))
          ))
    )
$$;

drop policy "visible communities" on public.communities;
create policy "visible communities" on public.communities for select to anon, authenticated
    using (public.community_visible(id));

drop function public.create_community(text, double precision, double precision, text, text, text, boolean);

create or replace function public.create_community(
    p_name text,
    p_lat double precision default null,
    p_lng double precision default null,
    p_city text default null,
    p_description text default '',
    p_kind text default 'neighborhood',
    p_is_private boolean default false,
    p_parent_id uuid default null
) returns public.communities
language plpgsql security definer set search_path = public, extensions as $$
declare
    me uuid := auth.uid();
    parent public.communities;
    center geography;
    c public.communities;
begin
    if me is null then raise exception 'יש להתחבר' using errcode = '28000'; end if;
    if p_parent_id is not null then
        select * into parent from public.communities where id = p_parent_id;
        if parent.id is null or not public.is_member(parent.id) then
            raise exception 'אפשר לפתוח תת-קהילה רק בקהילה שחברים בה' using errcode = '42501';
        end if;
        if parent.parent_id is not null then
            raise exception 'אי אפשר לפתוח תת-קהילה בתוך תת-קהילה' using errcode = '22023';
        end if;
    end if;
    if p_lat is not null and p_lng is not null then
        center := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
    else
        center := parent.center;
    end if;
    if center is null then raise exception 'חסר מיקום לקהילה' using errcode = '22023'; end if;

    insert into public.communities (name, description, kind, city, center, is_private, created_by, parent_id)
    values (trim(p_name), trim(coalesce(p_description, '')), p_kind, coalesce(p_city, parent.city),
            center, p_is_private, me, p_parent_id)
    returning * into c;
    insert into public.community_members (community_id, user_id, role) values (c.id, me, 'admin');
    insert into public.community_secrets (community_id) values (c.id);
    return c;
end $$;

revoke execute on function public.create_community from public, anon;
grant execute on function public.create_community to authenticated;

create or replace function public.join_community(p_community_id uuid default null, p_invite_code text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    me uuid := auth.uid();
    cid uuid;
begin
    if me is null then raise exception 'יש להתחבר' using errcode = '28000'; end if;
    if p_invite_code is not null and trim(p_invite_code) <> '' then
        select community_id into cid from public.community_secrets where invite_code = upper(trim(p_invite_code));
        if cid is null then raise exception 'קוד הזמנה לא נכון' using errcode = 'P0002'; end if;
    else
        select id into cid from public.communities
        where id = p_community_id and not is_private and public.community_visible(id);
        if cid is null then raise exception 'הקהילה פרטית — צריך קוד הזמנה' using errcode = '42501'; end if;
    end if;
    insert into public.community_members (community_id, user_id) values (cid, me) on conflict do nothing;
    -- Joining a building inside a neighbourhood also makes you a neighbour.
    insert into public.community_members (community_id, user_id)
    select parent_id, me from public.communities where id = cid and parent_id is not null
    on conflict do nothing;
    return cid;
end $$;

drop function public.communities_nearby(double precision, double precision, text);

create or replace function public.communities_nearby(
    p_lat double precision default null,
    p_lng double precision default null,
    p_query text default '',
    p_parent_id uuid default null
) returns table (
    id uuid, name text, description text, kind text, city text, is_private boolean,
    member_count integer, active_items integer, distance_km double precision, is_member boolean,
    parent_id uuid, parent_name text, sub_count integer
)
language sql stable security invoker set search_path = public, extensions as $$
    select
        c.id, c.name, c.description, c.kind, c.city, c.is_private,
        (select count(*)::int from public.community_members m where m.community_id = c.id),
        (select count(*)::int from public.items i where i.community_id = c.id and i.status = 'available'),
        case when p_lat is not null and c.center is not null
            then st_distance(c.center, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000 end,
        public.is_member(c.id),
        c.parent_id,
        (select p.name from public.communities p where p.id = c.parent_id),
        (select count(*)::int from public.communities s where s.parent_id = c.id)
    from public.communities c
    where (p_parent_id is null or c.parent_id = p_parent_id)
      and (p_query = '' or public.gb_normalize(c.name || ' ' || coalesce(c.city, '')) like '%' || public.gb_normalize(p_query) || '%')
    order by public.is_member(c.id) desc,
        case when p_lat is not null and c.center is not null
            then st_distance(c.center, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) end nulls last,
        c.created_at desc
    limit 50
$$;

-- ---------------------------------------------------------------------------
-- Community chat
-- ---------------------------------------------------------------------------

create table public.community_messages (
    id bigint generated always as identity primary key,
    community_id uuid not null references public.communities (id) on delete cascade,
    sender_id uuid not null references public.profiles (id) on delete cascade,
    body text not null check (char_length(body) between 1 and 2000),
    created_at timestamptz not null default clock_timestamp()
);
create index community_messages_idx on public.community_messages (community_id, id);

alter table public.community_messages enable row level security;

create policy "members read community chat" on public.community_messages for select to authenticated
    using (public.is_member(community_id) and not public.is_blocked_pair(auth.uid(), sender_id));
create policy "members write community chat" on public.community_messages for insert to authenticated
    with check (sender_id = auth.uid() and public.is_member(community_id));
create policy "delete own community message" on public.community_messages for delete to authenticated
    using (sender_id = auth.uid());

alter publication supabase_realtime add table public.community_messages;

-- ---------------------------------------------------------------------------
-- Alerts respect sub-community visibility too
-- ---------------------------------------------------------------------------

-- community_visible() for a given user rather than the caller, for triggers
-- that decide on someone else's behalf.
create or replace function public.community_visible_to(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select cid is null or exists (
        select 1 from public.communities c
        where c.id = cid
          and (not c.is_private or exists (
              select 1 from public.community_members m where m.community_id = c.id and m.user_id = uid))
          and (c.parent_id is null or exists (
              select 1 from public.communities p
              where p.id = c.parent_id
                and (not p.is_private or exists (
                    select 1 from public.community_members m where m.community_id = p.id and m.user_id = uid))
          ))
    )
$$;

create or replace function public.on_item_created_match_alerts()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
    if new.kind <> 'offer' or new.status <> 'available' then return new; end if;
    insert into public.notifications (user_id, kind, title, body, data)
    select distinct on (a.user_id)
        a.user_id, 'alert',
        '🔔 ' || new.title,
        'פורסם ב' || new.area_label || ' · מתאים להתראה ' || coalesce(nullif(a.label, ''), nullif(a.query, ''), 'שלך'),
        jsonb_build_object('item_id', new.id, 'alert_id', a.id)
    from public.alerts a
    where a.user_id <> new.owner_id
      and st_dwithin(a.center, new.approx_location, a.radius_km * 1000)
      and (a.category is null or a.category = new.category)
      and not public.is_blocked_pair(a.user_id, new.owner_id)
      and public.community_visible_to(new.community_id, a.user_id)
      and public.gb_matches(new.search_text, a.query);
    return new;
end $$;

-- ===== 20260926000000_request_address_city.sql =====
-- A request's pickup address belongs to the person who answered it, so it is
-- not completed with the requester's city.

create or replace function public.share_pickup_address(
    p_conversation_id uuid,
    p_address text default null,
    p_lat double precision default null,
    p_lng double precision default null
) returns public.messages
language plpgsql security definer set search_path = public, extensions as $$
declare
    me uuid := auth.uid();
    conv public.conversations;
    item public.items;
    priv public.item_private;
    giver uuid;
    addr text := nullif(trim(coalesce(p_address, '')), '');
    lat double precision := p_lat;
    lng double precision := p_lng;
    msg public.messages;
begin
    select * into conv from public.conversations where id = p_conversation_id;
    if conv.id is null or me not in (conv.owner_id, conv.requester_id) then
        raise exception 'השיחה לא נמצאה' using errcode = 'P0002';
    end if;
    select * into item from public.items where id = conv.item_id;
    giver := case when item.kind = 'offer' then conv.owner_id else conv.requester_id end;
    if me <> giver then
        raise exception 'רק מי שמוסר/ת את הפריט שולח/ת כתובת' using errcode = '42501';
    end if;
    if public.is_blocked_pair(conv.owner_id, conv.requester_id) then
        raise exception 'לא ניתן לשלוח הודעה למשתמש/ת הזה/ו' using errcode = '42501';
    end if;

    if item.kind = 'offer' then
        select * into priv from public.item_private where item_id = item.id;
        if addr is null or addr = priv.address then
            addr := nullif(priv.address, '');
            if priv.precise then
                lat := st_y(priv.location::geometry);
                lng := st_x(priv.location::geometry);
            end if;
        end if;
    end if;
    if addr is null then raise exception 'יש לכתוב כתובת' using errcode = '22023'; end if;
    -- The item's city completes the giver's own saved address on an offer. On
    -- a request the address is the answerer's, somewhere else entirely, so the
    -- app sends it complete (street, number and city).
    if item.kind = 'offer' and position(item.city in addr) = 0 then addr := addr || ', ' || item.city; end if;
    if lat is not null and (lat not between 29.3 and 33.5 or lng not between 34.2 and 35.95) then
        lat := null; lng := null;
    end if;

    insert into public.messages (conversation_id, sender_id, kind, body, address, lat, lng)
    values (conv.id, me, 'address', '📍 ' || addr, addr, lat, lng)
    returning * into msg;
    return msg;
end $$;

