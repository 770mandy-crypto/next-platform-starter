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

