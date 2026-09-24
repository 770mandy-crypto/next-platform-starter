// Two people, two browsers, one dresser: sign-up by email code, onboarding,
// posting with a photo, nearest-first Hebrew search, chat, sharing the address
// as a Waze link in real time, hand-over, thanks, alerts and communities.
//
//   npx supabase start && npx supabase db reset
//   npm run build:web && node e2e/serve.mjs dist &   # serves on :8082
//   node e2e/web-flow.cjs
const { chromium, BASE, SP, newUser, signIn, shot } = require('./lib.cjs');
const run = Date.now();
const title = `שידה 3 מגירות`;
const step = (s) => console.log('✓', s);
(async () => {
  const browser = await chromium.launch();
  const giver = await newUser(browser, { geo: { latitude: 32.0701, longitude: 34.8233 } });   // Ramat Gan
  const taker = await newUser(browser, { geo: { latitude: 32.0853, longitude: 34.7818 } });   // Tel Aviv

  // ── Giver: sign up, onboard, post ─────────────────────────────────────
  await giver.goto(BASE + '/');
  await giver.getByText('GiveBack').first().waitFor();
  await shot(giver, '01-home-signed-out');
  await signIn(giver, `dana.${run}@example.com`);
  await giver.getByTestId('onboarding-name').waitFor({ timeout: 15000 });
  await giver.getByTestId('onboarding-name').fill('דנה');
  await giver.getByText('המיקום שלי', { exact: true }).click();
  await giver.getByText(/ליד רמת גן/).waitFor();
  await shot(giver, '02-onboarding');
  await giver.getByTestId('onboarding-done').click();
  await giver.waitForURL(BASE + '/');
  step('giver signed up with email code and onboarded');

  await giver.getByTestId('tab-post').click();
  const chooser = giver.waitForEvent('filechooser');
  await giver.getByTestId('add-photo').click();
  await (await chooser).setFiles(`${SP}/dresser.jpg`);
  await giver.getByTestId('ai-banner').waitFor();
  await giver.getByTestId('title-input').fill(title);
  await giver.getByTestId('category-furniture').click();
  await giver.getByTestId('address-input').fill('ביאליק 10');
  await giver.getByText('הפריט נמצא כאן — השתמשו במיקום שלי').click();
  await giver.getByText('המיקום נקלט').waitFor();
  await shot(giver, '03-post-form');
  await giver.getByTestId('publish').click();
  await giver.waitForURL(/\/item\//, { timeout: 20000 });
  await giver.getByText('פורסם!', { exact: false }).waitFor();
  await giver.waitForTimeout(1500);
  await shot(giver, '04-item-owner');
  const itemUrl = giver.url().split('?')[0];
  step('giver posted item with photo');

  // ── Taker: sign up, find it nearest-first, ask for it ────────────────
  await signIn(taker, `yossi.${run}@example.com`);
  await taker.getByTestId('onboarding-name').waitFor({ timeout: 15000 });
  await taker.getByTestId('onboarding-name').fill('יוסי');
  await taker.getByText('המיקום שלי', { exact: true }).click();
  await taker.getByText(/ליד תל אביב/).waitFor();
  await taker.getByTestId('onboarding-done').click();
  await taker.waitForURL(BASE + '/');
  await taker.getByTestId('search-input').fill('השידה');
  const card = taker.locator('[data-testid^="item-"]').first();
  await card.waitFor({ timeout: 10000 });
  await taker.waitForTimeout(1200);
  await shot(taker, '05-search');
  const cardText = await card.getAttribute('aria-label');
  if (!/ק״מ/.test(cardText)) throw new Error('no distance on card: ' + cardText);
  step('taker found it by searching "השידה": ' + cardText);

  await card.click();
  await taker.waitForURL(/\/item\//);
  await taker.getByTestId('want-it').click();
  await taker.getByTestId('first-message').waitFor();
  await shot(taker, '06-item-compose');
  await taker.getByTestId('send-first-message').click();
  await taker.waitForURL(/\/chat\//, { timeout: 15000 });
  const chatUrl = taker.url();
  step('taker messaged the giver');

  // ── Giver: inbox badge, reply, share address ─────────────────────────
  await giver.goto(BASE + '/messages');
  const conv = giver.locator('[data-testid^="conversation-"]').first();
  await conv.waitFor({ timeout: 15000 });
  await shot(giver, '07-inbox');
  await conv.click();
  await giver.getByTestId('chat-input').fill('כן! אפשר מחר ב-18:00');
  await giver.getByTestId('chat-send').click();
  await giver.getByTestId('share-address').click();
  await giver.getByTestId('pickup-address').waitFor();
  let prefilled = '';
  for (let i = 0; i < 20 && prefilled !== 'ביאליק 10'; i++) {
    prefilled = await giver.getByTestId('pickup-address').inputValue();
    await giver.waitForTimeout(250);
  }
  if (prefilled !== 'ביאליק 10') throw new Error('address not prefilled: ' + prefilled);
  await giver.getByTestId('send-address').click();
  await giver.getByTestId('address-card').waitFor();
  step('giver shared the saved address');

  // ── Taker: sees it live, taps Waze ───────────────────────────────────
  await taker.getByTestId('address-card').waitFor({ timeout: 15000 });
  await taker.getByText('כן! אפשר מחר ב-18:00').waitFor();
  await taker.getByTestId('open-waze').click();
  const opened = await taker.evaluate(() => window.__opened);
  if (!opened.some((u) => /^https:\/\/waze\.com\/ul\?ll=32\.0701,34\.8233&navigate=yes$/.test(u))) {
    throw new Error('waze link wrong: ' + JSON.stringify(opened));
  }
  await shot(taker, '08-chat-address');
  step('taker received the address in real time; Waze opens ' + opened[0]);

  // ── Giver marks it given; taker thanks ───────────────────────────────
  await giver.getByTestId('chat-mark-given').click();
  await taker.getByTestId('send-thanks').waitFor({ timeout: 20000 });
  await taker.getByTestId('send-thanks').click();
  await taker.getByText('שלחת תודה 💚').waitFor();
  await shot(taker, '09-thanks');
  step('item marked given; taker sent thanks');

  // ── Results: search no longer shows it; profile stats ────────────────
  await giver.goto(BASE + '/profile');
  await giver.getByText('מסרת פריט אחד', { exact: false }).waitFor({ timeout: 15000 });
  await shot(giver, '10-profile');
  await taker.goto(BASE + '/');
  await taker.getByTestId('search-input').fill('השידה');
  await taker.getByText('עוד אין "השידה" בסביבה', { exact: false }).waitFor({ timeout: 10000 });
  await shot(taker, '11-empty-search');
  step('given item left search; giver stats updated');

  // ── Communities & alerts ────────────────────────────────────────────
  await taker.getByText('תודיעו לי כשזה יתפרסם').click();
  await taker.getByTestId('save-alert').click();
  await taker.getByText('עד 3 ק״מ').last().waitFor();
  step('taker saved an alert');

  await giver.goto(BASE + '/communities/new');
  await giver.getByPlaceholder('בניין הרצל 12 / גן החצב / שכונת נווה עוז').fill('בניין ביאליק 10');
  await giver.getByText('יצירת הקהילה').click();
  await giver.getByText('הזמינו שכנים').waitFor({ timeout: 15000 });
  await shot(giver, '12-community');
  step('giver created a private community with an invite code');

  await browser.close();
  console.log('ALL PASSED', itemUrl, chatUrl);
})().catch(async (e) => { console.error('FAILED', e.message.split('\n')[0]); process.exit(1); });
