// End-to-end checks of the database: privacy rules, search, chat, hand-over,
// alerts, communities and blocking — run against a local Supabase stack.
//
//   npx supabase start && npm run test:backend
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import test, { before } from 'node:test';
import { createClient } from '@supabase/supabase-js';

const env = JSON.parse(
  execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
);
const URL = env.API_URL;
const admin = createClient(URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(URL, env.ANON_KEY, { auth: { persistSession: false } });

const run = Date.now();
let userCount = 0;
async function makeUser(name) {
  const email = `user${++userCount}.${run}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const client = createClient(URL, env.ANON_KEY, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: 'password123' });
  if (signInError) throw signInError;
  return { id: data.user.id, name, db: client };
}

function ok({ data, error }) {
  if (error) throw new Error(`${error.code}: ${error.message}`);
  return data;
}

// Ramat Gan (giver), Tel Aviv (taker), Haifa (far away).
const RG = { lat: 32.0701, lng: 34.8233 };
const TLV = { lat: 32.0853, lng: 34.7818 };
const HAIFA = { lat: 32.794, lng: 34.9896 };

let dana, yossi, rina, eli;
before(async () => {
  [dana, yossi, rina, eli] = await Promise.all(['דנה', 'יוסי', 'רינה', 'אלי'].map(makeUser));
});

function post(user, extra = {}) {
  return user.db
    .rpc('create_item', {
      p_title: `שידה 3 מגירות ${run}`,
      p_category: 'furniture',
      p_lat: RG.lat,
      p_lng: RG.lng,
      p_city: 'רמת גן',
      p_area_label: 'הבורסה, רמת גן',
      p_description: 'עץ מלא',
      p_condition: 'good',
      p_address: 'ביאליק 10',
      p_precise: true,
      ...extra,
    })
    .single()
    .then(ok);
}

test('profile is created from the Google-style metadata', async () => {
  const p = ok(await dana.db.from('profiles').select('*').eq('id', dana.id).single());
  assert.equal(p.display_name, 'דנה');
  // Display name is editable, but nothing else about someone else's profile.
  ok(await dana.db.from('profiles').update({ bio: 'אוהבת למסור' }).eq('id', dana.id));
  await yossi.db.from('profiles').update({ bio: 'hacked' }).eq('id', dana.id);
  assert.equal(ok(await dana.db.from('profiles').select('bio').eq('id', dana.id).single()).bio, 'אוהבת למסור');
});

test('exact location and address are private to the owner', async () => {
  const item = await post(dana);
  assert.equal(ok(await yossi.db.from('item_private').select('*').eq('item_id', item.id)).length, 0);
  assert.equal(ok(await anon.from('item_private').select('*').eq('item_id', item.id)).length, 0);
  const mine = ok(await dana.db.from('item_private').select('address, precise').eq('item_id', item.id).single());
  assert.deepEqual(mine, { address: 'ביאליק 10', precise: true });

  // The public point is moved 150–450 m from the real one.
  const card = ok(await anon.from('item_cards').select('approx_lat, approx_lng').eq('id', item.id).single());
  const dLat = (card.approx_lat - RG.lat) * 110540;
  const dLng = (card.approx_lng - RG.lng) * 111320 * Math.cos((RG.lat * Math.PI) / 180);
  const moved = Math.hypot(dLat, dLng);
  assert.ok(moved > 140 && moved < 460, `moved ${moved} m`);

  // Owners cannot move the item or change its status by a direct update.
  const { error } = await dana.db.from('items').update({ status: 'given' }).eq('id', item.id);
  assert.ok(error);
});

test('search is nearest-first, understands Hebrew prefixes, and honours radius', async () => {
  const near = await post(dana, { p_title: `כיסא משרדי ${run}` });
  const far = await post(rina, {
    p_title: `כיסא עץ ${run}`,
    p_lat: HAIFA.lat,
    p_lng: HAIFA.lng,
    p_city: 'חיפה',
    p_area_label: 'חיפה',
  });
  const results = ok(await anon.rpc('search_items', { p_lat: TLV.lat, p_lng: TLV.lng, p_query: `הכיסא ${run}` }));
  assert.deepEqual(
    results.map((r) => r.id),
    [near.id, far.id],
  );
  assert.ok(results[0].distance_km > 2 && results[0].distance_km < 7);
  assert.ok(results[1].distance_km > 75);

  const within = ok(
    await anon.rpc('search_items', { p_lat: TLV.lat, p_lng: TLV.lng, p_radius_km: 15, p_query: `כיסא ${run}` }),
  );
  assert.deepEqual(
    within.map((r) => r.id),
    [near.id],
  );

  const byCategory = ok(await anon.rpc('search_items', { p_query: `רהיטים ${run}` }));
  assert.ok(byCategory.length >= 2);
});

test('chat → address with exact point → reserve → given → thanks', async () => {
  const item = await post(dana, { p_title: `ספה תלת ${run}` });

  await assert.rejects(dana.db.rpc('start_conversation', { p_item_id: item.id, p_body: 'היי' }).then(ok), /הפריט שלך/);
  const cid = ok(await yossi.db.rpc('start_conversation', { p_item_id: item.id, p_body: 'עוד רלוונטי?' }));
  const cid2 = ok(await rina.db.rpc('start_conversation', { p_item_id: item.id, p_body: 'גם אני אשמח' }));

  ok(await dana.db.from('messages').insert({ conversation_id: cid, sender_id: dana.id, body: 'כן! מתי נוח?' }));
  // Nobody can post into a chat they are not part of, or forge an address message.
  assert.ok((await eli.db.from('messages').insert({ conversation_id: cid, sender_id: eli.id, body: 'x' })).error);
  assert.ok(
    (await yossi.db.from('messages').insert({ conversation_id: cid, sender_id: yossi.id, kind: 'address', body: 'x' }))
      .error,
  );
  assert.equal(ok(await eli.db.from('messages').select('*').eq('conversation_id', cid)).length, 0);

  // Only the giver may share the address; it carries the exact point.
  await assert.rejects(yossi.db.rpc('share_pickup_address', { p_conversation_id: cid }).then(ok), /רק מי שמוסר/);
  const addr = ok(await dana.db.rpc('share_pickup_address', { p_conversation_id: cid }).single());
  assert.equal(addr.address, 'ביאליק 10, רמת גן');
  assert.equal(addr.lat, RG.lat);
  assert.equal(addr.lng, RG.lng);

  const inbox = ok(await yossi.db.rpc('list_conversations'));
  const row = inbox.find((c) => c.id === cid);
  assert.equal(row.other_name, 'דנה');
  assert.equal(row.role, 'taker');
  assert.equal(row.unread, 2);
  assert.equal(row.last_message_preview, '📍 כתובת לאיסוף');
  ok(await yossi.db.rpc('mark_conversation_read', { p_conversation_id: cid }));
  assert.equal(ok(await yossi.db.rpc('list_conversations')).find((c) => c.id === cid).unread, 0);

  // Reserve for Yossi: he is told it is his, Rina that it is taken.
  await assert.rejects(
    dana.db.rpc('set_item_status', { p_item_id: item.id, p_status: 'reserved', p_recipient: eli.id }).then(ok),
    /מי שכתב/,
  );
  ok(await dana.db.rpc('set_item_status', { p_item_id: item.id, p_status: 'reserved', p_recipient: yossi.id }));
  const lastFor = async (user, conv) =>
    ok(
      await user.db.from('messages').select('*').eq('conversation_id', conv).order('id', { ascending: false }).limit(1),
    )[0];
  assert.match((await lastFor(yossi, cid)).body, /נשמר עבורך/);
  assert.match((await lastFor(rina, cid2)).body, /למישהו אחר/);

  // Thanks are only possible after the hand-over.
  const thank = () =>
    yossi.db.from('thanks').insert({ item_id: item.id, from_id: yossi.id, to_id: dana.id, body: 'תודה ענקית!' });
  assert.ok((await thank()).error);
  ok(await dana.db.rpc('set_item_status', { p_item_id: item.id, p_status: 'given' }));
  const given = ok(await anon.from('items').select('status, given_to').eq('id', item.id).single());
  assert.deepEqual(given, { status: 'given', given_to: yossi.id });
  ok(await thank());
  assert.ok(
    (await rina.db.from('thanks').insert({ item_id: item.id, from_id: rina.id, to_id: yossi.id, body: 'x' })).error,
  );

  const stats = ok(await anon.rpc('get_profile_stats', { p_user_id: dana.id }).single());
  assert.equal(stats.given_count, 1);
  assert.equal(stats.thanks_count, 1);
  assert.equal(ok(await anon.rpc('get_profile_stats', { p_user_id: yossi.id }).single()).received_count, 1);

  // Given items leave search; new conversations about them are refused.
  const found = ok(await anon.rpc('search_items', { p_query: `ספה ${run}` }));
  assert.equal(found.length, 0);
  await assert.rejects(eli.db.rpc('start_conversation', { p_item_id: item.id, p_body: 'היי' }).then(ok), /כבר נמסר/);

  // Notifications were produced for each step, only for their owners.
  const kinds = ok(await yossi.db.from('notifications').select('kind, data')).filter((n) => n.data.item_id === item.id);
  assert.ok(kinds.some((n) => n.kind === 'message'));
  assert.ok(kinds.some((n) => n.kind === 'status'));
  assert.ok(ok(await dana.db.from('notifications').select('kind')).some((n) => n.kind === 'thanks'));
});

test('saved-search alerts fire for matching nearby posts only', async () => {
  ok(
    await eli.db.from('alerts').insert({
      user_id: eli.id,
      query: `עגלה ${run}`,
      center: `SRID=4326;POINT(${TLV.lng} ${TLV.lat})`,
      radius_km: 10,
    }),
  );
  const match = await post(dana, { p_title: `עגלת תינוק ${run}`, p_category: 'baby' });
  await post(dana, { p_title: `מיטה ${run}` });
  await post(rina, { p_title: `עגלה ${run}`, p_lat: HAIFA.lat, p_lng: HAIFA.lng, p_city: 'חיפה', p_category: 'baby' });

  const alerts = ok(await eli.db.from('notifications').select('*').eq('kind', 'alert'));
  assert.deepEqual(
    alerts.map((n) => n.data.item_id),
    [match.id],
  );
});

test('private communities hide their items from outsiders', async () => {
  const community = ok(
    await dana.db
      .rpc('create_community', { p_name: `בניין ביאליק 10 ${run}`, p_lat: RG.lat, p_lng: RG.lng, p_is_private: true })
      .single(),
  );
  const item = await post(dana, { p_title: `ספרי ילדים ${run}`, p_community_id: community.id, p_category: 'books' });
  await assert.rejects(post(yossi, { p_community_id: community.id }), /קהילה/);

  assert.equal(ok(await yossi.db.from('items').select('id').eq('id', item.id)).length, 0);
  assert.equal(ok(await anon.rpc('search_items', { p_query: `ספרי ${run}` })).length, 0);

  await assert.rejects(yossi.db.rpc('join_community', { p_community_id: community.id }).then(ok), /קוד/);
  const code = ok(await dana.db.rpc('get_invite_code', { p_community_id: community.id }));
  assert.equal(ok(await yossi.db.rpc('get_invite_code', { p_community_id: community.id })), null);
  ok(await yossi.db.rpc('join_community', { p_invite_code: code.toLowerCase() }));

  assert.equal(ok(await yossi.db.from('items').select('id').eq('id', item.id)).length, 1);
  const list = ok(await yossi.db.rpc('communities_nearby', { p_lat: TLV.lat, p_lng: TLV.lng }));
  const mine = list.find((c) => c.id === community.id);
  assert.equal(mine.is_member, true);
  assert.equal(mine.member_count, 2);
});

test('blocking hides items and stops messages both ways', async () => {
  const item = await post(rina, { p_title: `מנורה ${run}`, p_category: 'home' });
  const cid = ok(await eli.db.rpc('start_conversation', { p_item_id: item.id, p_body: 'היי' }));
  ok(await rina.db.from('blocks').insert({ blocker_id: rina.id, blocked_id: eli.id }));

  assert.equal(ok(await eli.db.rpc('search_items', { p_query: `מנורה ${run}` })).length, 0);
  assert.ok((await eli.db.from('messages').insert({ conversation_id: cid, sender_id: eli.id, body: 'שוב' })).error);
  // Eli cannot see that Rina blocked him.
  assert.equal(ok(await eli.db.from('blocks').select('*')).length, 0);
});

test('reports and account deletion', async () => {
  const item = await post(rina, { p_title: `משהו חשוד ${run}` });
  ok(await eli.db.from('reports').insert({ item_id: item.id, reason: 'scam', details: 'מבקש כסף' }));
  assert.equal(ok(await rina.db.from('reports').select('*')).length, 0);

  const temp = await makeUser('זמני');
  await post(temp, { p_title: `פריט זמני ${run}` });
  ok(await temp.db.rpc('delete_my_account'));
  assert.equal(ok(await admin.from('profiles').select('id').eq('id', temp.id)).length, 0);
  assert.equal(ok(await admin.from('items').select('id').eq('owner_id', temp.id)).length, 0);
});

test('photos: users upload only into their own folder', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  );
  ok(await dana.db.storage.from('item-photos').upload(`${dana.id}/${run}.png`, png, { contentType: 'image/png' }));
  const { error } = await yossi.db.storage
    .from('item-photos')
    .upload(`${dana.id}/${run}-x.png`, png, { contentType: 'image/png' });
  assert.ok(error);
  await assert.rejects(post(dana, { p_photos: [`${yossi.id}/x.jpg`] }), /תמונה/);
});

test('"wanted" posts: the person who answers is the giver and shares the address', async () => {
  const wanted = await post(yossi, {
    p_kind: 'wanted',
    p_title: `מחפש עריסה ${run}`,
    p_category: 'baby',
    p_address: '',
  });
  assert.equal(wanted.condition, null);
  const found = ok(await anon.rpc('search_items', { p_kind: 'wanted', p_query: `עריסה ${run}` }));
  assert.deepEqual(
    found.map((r) => r.id),
    [wanted.id],
  );

  const cid = ok(await rina.db.rpc('start_conversation', { p_item_id: wanted.id, p_body: 'יש לי עריסה!' }));
  await assert.rejects(
    yossi.db.rpc('share_pickup_address', { p_conversation_id: cid, p_address: 'x' }).then(ok),
    /רק מי שמוסר/,
  );
  const msg = ok(
    await rina.db
      .rpc('share_pickup_address', { p_conversation_id: cid, p_address: 'הרצל 5', p_lat: 32.07, p_lng: 34.8 })
      .single(),
  );
  assert.equal(msg.address, 'הרצל 5, רמת גן');
  assert.equal(ok(await yossi.db.rpc('list_conversations')).find((c) => c.id === cid).role, 'taker');
});
