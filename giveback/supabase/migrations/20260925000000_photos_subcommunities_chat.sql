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
