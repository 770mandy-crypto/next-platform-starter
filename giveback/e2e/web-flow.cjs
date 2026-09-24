// The whole app, A to Z, with real people in real browsers against a local
// Supabase: sign-up by email code, onboarding, a listing that must carry its
// own photo (and shows exactly that photo), nearest-first Hebrew search,
// chat, the address as a Waze link in real time, the same account on a second
// device, editing photos, hand-over and thanks, alerts, and a community with a
// community inside it and its own group chat.
//
//   npx supabase start && npx supabase db reset
//   npm run build:web            # then put the local keys into dist/config.js
//   node e2e/serve.mjs dist &    # serves on :8082
//   node e2e/web-flow.cjs
const { chromium, BASE, SP, newUser, signIn, shot, firstPhoto } = require('./lib.cjs');

const run = Date.now();
const DANA = `dana.${run}@example.com`;
const title = 'שידה 3 מגירות';
const step = (s) => console.log('✓', s);
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const pages = [];
(async () => {
  const browser = await chromium.launch();
  const giver = await newUser(browser, { geo: { latitude: 32.0701, longitude: 34.8233 } }); // Ramat Gan
  const taker = await newUser(browser, { geo: { latitude: 32.0853, longitude: 34.7818 } }); // Tel Aviv
  pages.push(giver, taker);

  // ── Giver: sign up, onboard ───────────────────────────────────────────
  await giver.goto(BASE + '/');
  await giver.getByText('GiveBack').first().waitFor();
  await shot(giver, '01-home-signed-out');
  await signIn(giver, DANA);
  await giver.getByTestId('onboarding-name').waitFor({ timeout: 15000 });
  await giver.getByTestId('onboarding-name').fill('דנה');
  await giver.getByText('המיקום שלי', { exact: true }).click();
  await giver.getByText(/ליד רמת גן/).waitFor();
  await shot(giver, '02-onboarding');
  await giver.getByTestId('onboarding-done').click();
  await giver.waitForURL(BASE + '/');
  step('giver signed up with an email code and onboarded');

  // ── Post: a photo is required, and the listing shows that very photo ──
  await giver.getByTestId('tab-post').click();
  await giver.getByTestId('title-input').fill(title);
  await giver.getByTestId('category-furniture').click();
  await giver.getByTestId('publish').click();
  await giver.getByText('הוסיפו לפחות תמונה אחת של הפריט עצמו').waitFor();
  step('publishing without a photo is refused');

  const chooser = giver.waitForEvent('filechooser');
  await giver.getByTestId('add-photo').click();
  await (await chooser).setFiles(`${SP}/dresser.jpg`);
  await giver.getByTestId('ai-banner').waitFor();
  await giver.getByTestId('address-input').fill('ביאליק 10');
  await giver.getByText('הפריט נמצא כאן — השתמשו במיקום שלי').click();
  await giver.getByText('המיקום נקלט').waitFor();
  await shot(giver, '03-post-form');
  await giver.getByTestId('publish').click();
  await giver.waitForURL(/\/item\//, { timeout: 20000 });
  await giver.getByText('פורסם!', { exact: false }).waitFor();
  const posted = await firstPhoto(giver);
  expect(posted.w === 1200 && posted.h === 1000, `item page shows a different picture: ${JSON.stringify(posted)}`);
  await shot(giver, '04-item-owner');
  const itemUrl = giver.url().split('?')[0];
  step('posted; the item page shows the uploaded 1200×1000 photo');

  // ── Taker: finds it nearest-first, sees the same photo, asks for it ──
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
  const cardPhoto = await firstPhoto(taker);
  expect(cardPhoto.src === posted.src, 'search card shows a different photo');
  await shot(taker, '05-search');
  const cardText = await card.getAttribute('aria-label');
  expect(/ק״מ/.test(cardText), 'no distance on card: ' + cardText);
  step('taker found it by searching "השידה" with the same photo: ' + cardText);

  await card.click();
  await taker.waitForURL(/\/item\//);
  await taker.getByTestId('want-it').click();
  await taker.getByTestId('first-message').waitFor();
  await shot(taker, '06-item-compose');
  await taker.getByTestId('send-first-message').click();
  await taker.waitForURL(/\/chat\//, { timeout: 15000 });
  step('taker messaged the giver');

  // ── Giver: inbox, reply, share address ───────────────────────────────
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
  expect(prefilled === 'ביאליק 10', 'address not prefilled: ' + prefilled);
  await giver.getByTestId('send-address').click();
  await giver.getByTestId('address-card').waitFor();
  step('giver shared the saved address');

  // ── Taker: live address, Waze ────────────────────────────────────────
  await taker.getByTestId('address-card').waitFor({ timeout: 15000 });
  await taker.getByText('כן! אפשר מחר ב-18:00').waitFor();
  await taker.getByTestId('open-waze').click();
  const opened = await taker.evaluate(() => window.__opened);
  expect(
    opened.some((u) => u === 'https://waze.com/ul?ll=32.0701,34.8233&navigate=yes'),
    'waze link wrong: ' + JSON.stringify(opened),
  );
  await shot(taker, '08-chat-address');
  step('taker got the address in real time; Waze opens ' + opened[0]);

  // ── Same account on another device ──────────────────────────────────
  const phone2 = await newUser(browser, {});
  pages.push(phone2);
  await signIn(phone2, DANA);
  await phone2.waitForURL(BASE + '/', { timeout: 15000 });
  expect(!(await phone2.getByTestId('onboarding-name').count()), 'second device was sent to onboarding again');
  await phone2.goto(BASE + '/profile');
  await phone2.getByText('דנה').first().waitFor({ timeout: 15000 });
  await phone2.getByText(title).first().waitFor();
  await phone2.goto(BASE + '/messages');
  await phone2.getByText('יוסי').first().waitFor({ timeout: 15000 });
  await shot(phone2, '09-second-device');
  step('same email on a second device opens the same profile, items and chats');

  // ── Edit: add a photo and make it the main one ───────────────────────
  await phone2.goto(itemUrl.replace('/item/', '/item/edit/'));
  await phone2.getByTestId('save-item').waitFor({ timeout: 15000 });
  const chooser2 = phone2.waitForEvent('filechooser');
  await phone2.getByTestId('edit-add-photo').click();
  await (await chooser2).setFiles(`${SP}/books.jpg`);
  await phone2.getByTestId('edit-photo-1').click();
  await phone2.getByTestId('save-item').click();
  await phone2.waitForURL(/\/item\/[^/]+$/, { timeout: 20000 });
  await phone2.goto(itemUrl);
  const mainNow = await firstPhoto(phone2);
  expect(mainNow.w === 900 && mainNow.h === 900, `main photo did not change: ${JSON.stringify(mainNow)}`);
  step('edited from the second device: new photo added and made the main one');

  // ── Hand-over and thanks ─────────────────────────────────────────────
  await giver.getByTestId('chat-mark-given').click();
  await taker.getByTestId('send-thanks').waitFor({ timeout: 20000 });
  await taker.getByTestId('send-thanks').click();
  await taker.getByText('שלחת תודה 💚').waitFor();
  await shot(taker, '10-thanks');
  await giver.goto(BASE + '/profile');
  await giver.getByText('מסרת פריט אחד', { exact: false }).waitFor({ timeout: 15000 });
  await shot(giver, '11-profile');
  await taker.goto(BASE + '/');
  await taker.getByTestId('search-input').fill('השידה');
  await taker.getByText('עוד אין "השידה" בסביבה', { exact: false }).waitFor({ timeout: 10000 });
  step('marked given; thanks sent; it left search; stats updated');

  await taker.getByText('תודיעו לי כשזה יתפרסם').click();
  await taker.getByTestId('save-alert').click();
  await taker.getByText('עד 3 ק״מ').last().waitFor();
  step('taker saved an alert');

  // ── Community, a community inside it, and its group chat ─────────────
  await giver.goto(BASE + '/communities/new');
  await giver.getByTestId('community-name').fill('שכונת הבורסה');
  await giver.getByTestId('create-community').click();
  await giver.getByText('הזמינו שכנים').waitFor({ timeout: 15000 });
  const code = (await giver.getByText(/^[0-9A-F]{6}$/).first().textContent()).trim();
  await giver.getByText(/^קהילות בתוכה/).click();
  await giver.getByTestId('create-sub-community').click();
  await giver.getByTestId('community-name').fill('בניין ביאליק 10');
  await giver.getByTestId('create-community').click();
  await giver.getByText('↩ חלק משכונת הבורסה').waitFor({ timeout: 15000 });
  const buildingUrl = giver.url();
  step(`giver opened "שכונת הבורסה" (code ${code}) and "בניין ביאליק 10" inside it`);

  await taker.goto(BASE + '/communities');
  await taker.getByPlaceholder('ABC123').fill(code);
  await taker.getByText('הצטרפות', { exact: true }).first().click();
  await taker.getByText(/^קהילות בתוכה/).click({ timeout: 15000 });
  await taker.getByText('בניין ביאליק 10').filter({ visible: true }).first().click();
  await taker.getByTestId('community-join').filter({ visible: true }).first().click();
  await taker.getByText('יציאה מהקהילה').filter({ visible: true }).first().waitFor({ timeout: 15000 });
  await taker.getByText('שיחה', { exact: true }).filter({ visible: true }).first().click();
  await taker.getByTestId('community-chat-input').filter({ visible: true }).first().fill('מישהו צריך קרטונים למעבר?');
  await taker.getByTestId('community-chat-send').filter({ visible: true }).first().click();

  await giver.goto(buildingUrl);
  await giver.getByText('שיחה', { exact: true }).click();
  await giver.getByText('מישהו צריך קרטונים למעבר?').waitFor({ timeout: 15000 });
  await giver.getByTestId('community-chat-input').fill('יש לי 10, תעבור לקחת 🙂');
  await giver.getByTestId('community-chat-send').click();
  await taker.getByText('יש לי 10, תעבור לקחת 🙂').filter({ visible: true }).first().waitFor({ timeout: 15000 });
  await shot(taker, '12-community-chat');
  step('taker joined by code, joined the building, and the two chatted in the building group live');

  await browser.close();
  console.log('ALL PASSED');
})().catch(async (e) => {
  console.error('FAILED', e.message.split('\n')[0]);
  await Promise.all(pages.map((p, i) => shot(p, `failure-${i}`).catch(() => {})));
  process.exit(1);
});
