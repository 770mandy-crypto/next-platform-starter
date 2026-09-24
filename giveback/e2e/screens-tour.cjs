// Every screen and option, one by one: location (GPS, refused permission,
// choosing a city, moving), discover filters, map, posting an offer and a
// request, favourites, reporting, messages (quick replies, reserve, block),
// the "wanted" hand-over with a typed address, profile and its sub-screens,
// alerts, notifications, sign out / in, and deleting an account.
//
// Same setup as web-flow.cjs; run with: node e2e/screens-tour.cjs
const { chromium, BASE, SP, newUser, signIn, shot, firstPhoto } = require('./lib.cjs');

const run = Date.now();
const RAMAT_GAN = { latitude: 32.0701, longitude: 34.8233 };
const TEL_AVIV = { latitude: 32.0853, longitude: 34.7818 };
const HAIFA = { latitude: 32.794, longitude: 34.9896 };
const ok = (s) => console.log('✓', s);
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const pages = [];
const visible = (page, sel) => page.locator(sel).filter({ visible: true }).first();
const text = (page, t, exact = false) => page.getByText(t, { exact }).filter({ visible: true }).first();

async function onboard(page, name, useGps) {
  await page.getByTestId('onboarding-name').waitFor({ timeout: 15000 });
  await page.getByTestId('onboarding-name').fill(name);
  if (useGps) await page.getByText('המיקום שלי', { exact: true }).click();
}

(async () => {
  const browser = await chromium.launch();
  const dana = await newUser(browser, { geo: RAMAT_GAN });
  const yossi = await newUser(browser, { geo: TEL_AVIV });
  // Rina's browser refuses location permission.
  const rinaCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'he-IL',
    isMobile: true,
    hasTouch: true,
  });
  const rina = await rinaCtx.newPage();
  rina.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  pages.push(dana, yossi, rina);

  // ── 1. Location ───────────────────────────────────────────────────────
  await signIn(dana, `dana.${run}@example.com`);
  await onboard(dana, 'דנה', true);
  await dana.getByText(/ליד רמת גן/).waitFor();
  await dana.getByTestId('onboarding-done').click();
  await dana.waitForURL(BASE + '/');
  await text(dana, 'ליד רמת גן').waitFor();
  ok('GPS: detected "ליד רמת גן" during onboarding and on the home screen');

  await signIn(rina, `rina.${run}@example.com`);
  await onboard(rina, 'רינה', true);
  await rina.getByText('לא ניתנה הרשאת מיקום — אפשר לבחור עיר במקום').waitFor({ timeout: 10000 });
  await rina.getByText('בחירת עיר', { exact: true }).click();
  await rina.getByPlaceholder('חיפוש עיר…').fill('חיפה');
  await rina.getByText('חיפה', { exact: true }).last().click();
  await rina.getByText('📍 חיפה').waitFor();
  await shot(rina, 'tour-01-location-refused');
  await rina.getByTestId('onboarding-done').click();
  await rina.waitForURL(BASE + '/');
  ok('location refused: clear message, then choosing a city (חיפה) works');

  await signIn(yossi, `yossi.${run}@example.com`);
  await onboard(yossi, 'יוסי', true);
  await yossi.getByText(/ליד תל אביב/).waitFor();
  await yossi.getByTestId('onboarding-done').click();
  await yossi.waitForURL(BASE + '/');

  // ── 2. Posting: an offer with a photo, a request without ─────────────
  await dana.getByTestId('tab-post').click();
  const chooser = dana.waitForEvent('filechooser');
  await dana.getByTestId('add-photo').click();
  await (await chooser).setFiles(`${SP}/dresser.jpg`);
  await dana.getByTestId('title-input').fill('שידה 3 מגירות');
  await dana.getByTestId('category-furniture').click();
  await dana.getByTestId('address-input').fill('ביאליק 10');
  await dana.getByText('הפריט נמצא כאן — השתמשו במיקום שלי').click();
  await dana.getByText('המיקום נקלט').waitFor();
  await dana.getByTestId('publish').click();
  await dana.waitForURL(/\/item\//, { timeout: 20000 });
  const itemUrl = dana.url().split('?')[0];
  ok('offer posted with a photo');

  await yossi.getByTestId('tab-post').click();
  await yossi.getByText('אני מחפש/ת', { exact: true }).click();
  await visible(yossi, '[data-testid="title-input"]').fill('עגלת תינוק');
  await yossi.getByTestId('category-baby').click();
  await yossi.getByText('השתמשו במיקום שלי', { exact: true }).click();
  await yossi.getByText('המיקום נקלט').waitFor();
  await shot(yossi, 'tour-02-post-wanted');
  await yossi.getByTestId('publish').click();
  await yossi.waitForURL(/\/item\//, { timeout: 20000 });
  const wantedUrl = yossi.url().split('?')[0];
  ok('request ("מחפש/ת") posted without a photo');

  // ── 3. Discover: nearest first, filters, radius, empty state ─────────
  await yossi.goto(BASE + '/');
  const card = visible(yossi, '[data-testid^="item-"]');
  await card.waitFor({ timeout: 15000 });
  const label = await card.getAttribute('aria-label');
  expect(/שידה.*ק״מ/.test(label), 'home card: ' + label);
  await yossi.getByText('ספרים', { exact: true }).click();
  await yossi.getByText('עוד אין כאן פריטים').waitFor();
  await yossi.getByText('רהיטים', { exact: true }).click();
  await card.waitFor();
  await yossi.getByText('עד 1 ק״מ', { exact: true }).click();
  await yossi.getByText('עוד אין כאן פריטים').waitFor();
  await yossi.getByText('כל הארץ', { exact: true }).click();
  await card.waitFor();
  await yossi.getByText('הכל', { exact: true }).click();
  await yossi.getByText('מחפשים', { exact: true }).click();
  await text(yossi, 'עגלת תינוק').waitFor();
  await yossi.getByText('מוסרים בחינם', { exact: true }).click();
  ok(`discover: "${label}"; category, 1 km radius, whole country and requests tabs all filter correctly`);

  // Moving: the phone's location changes; "use my location" follows it.
  await yossi.context().setGeolocation(HAIFA);
  await yossi.getByTestId('location-pill').click();
  await yossi.getByText('לפי המיקום הנוכחי שלי').click();
  await text(yossi, 'ליד חיפה').waitFor({ timeout: 10000 });
  await yossi.getByText('כל הארץ', { exact: true }).click();
  const far = await visible(yossi, '[data-testid^="item-"]').getAttribute('aria-label');
  expect(/(\d{2,}) ק״מ/.test(far), 'distance from Haifa should be tens of km: ' + far);
  await yossi.context().setGeolocation(TEL_AVIV);
  await yossi.getByTestId('location-pill').click();
  await yossi.getByText('לפי המיקום הנוכחי שלי').click();
  await text(yossi, 'ליד תל אביב').waitFor({ timeout: 10000 });
  await yossi.getByText('עד 5 ק״מ', { exact: true }).click();
  await shot(yossi, 'tour-03-discover');
  ok(`moving to Haifa updates location and distances ("${far}"), and back to Tel Aviv`);

  // ── 4. Map tab ───────────────────────────────────────────────────────
  await yossi.goto(BASE + '/map');
  await yossi.getByText('מה יש בסביבה').waitFor();
  await text(yossi, 'שידה 3 מגירות').waitFor({ timeout: 15000 });
  await text(yossi, /פריטים עד 15 ק״מ/).waitFor();
  await shot(yossi, 'tour-04-map');
  await text(yossi, 'שידה 3 מגירות').click();
  await yossi.waitForURL(/\/item\//);
  ok('map tab lists nearby items with distance and opens them (web build shows the list; phones draw the map)');

  // ── 5. Item page: photo, map area, favourite, report ────────────────
  await firstPhoto(yossi);
  await text(yossi, 'המפה מראה אזור בלבד', false).waitFor();
  await yossi.getByLabel('שמירה').first().click();
  await yossi.getByLabel('הסרה מהשמורים').first().waitFor();
  await yossi.goto(BASE + '/favorites');
  await text(yossi, 'שידה 3 מגירות').waitFor({ timeout: 10000 });
  ok('item page shows photo and area; saving to favourites works');

  await rina.goto(itemUrl);
  await rina.getByLabel('דיווח').first().click();
  await rina.getByText('ספאם', { exact: true }).click();
  await rina.getByText('שליחת דיווח').click();
  await rina.getByText('תודה על הדיווח 🙏').waitFor();
  await rina.getByText('סגירה', { exact: true }).click();
  ok('reporting an item works');

  // ── 6. Messages ─────────────────────────────────────────────────────
  await yossi.goto(itemUrl);
  await yossi.getByTestId('want-it').click();
  await yossi.getByTestId('send-first-message').click();
  await yossi.waitForURL(/\/chat\//, { timeout: 15000 });
  const chatUrl = yossi.url();
  await yossi.getByText('מתי נוח לך?', { exact: true }).click();
  await text(yossi, 'מתי נוח לך?').waitFor();
  ok('first message and a quick-reply chip');

  await dana.goto(BASE + '/messages');
  const row = visible(dana, '[data-testid^="conversation-"]');
  await row.waitFor({ timeout: 15000 });
  expect(/2/.test(await row.innerText()), 'inbox should show 2 unread');
  await shot(dana, 'tour-05-inbox-unread');
  await row.click();
  await text(dana, 'מתי נוח לך?').waitFor();
  await dana.getByText('לשמור עבורו/ה').click();
  await text(yossi, 'הפריט נשמר עבורך 🎉 תאמו איסוף').waitFor({ timeout: 15000 });
  ok('inbox unread count; reserving for Yossi reaches him live');

  dana.once('dialog', (d) => d.accept());
  await dana.getByLabel('אפשרויות').first().click();
  await text(dana, 'חסמת את יוסי', false).waitFor({ timeout: 10000 });
  dana.once('dialog', (d) => d.accept());
  await dana.getByLabel('אפשרויות').first().click();
  await dana.getByTestId('chat-input').waitFor({ timeout: 10000 });
  ok('block and unblock from the chat menu');

  // ── 7. A request: Dana has a stroller, types her own address ────────
  await dana.goto(BASE + '/');
  await dana.getByText('מחפשים', { exact: true }).click();
  await text(dana, 'עגלת תינוק').click();
  await dana.getByTestId('want-it').click();
  await dana.getByTestId('send-first-message').click();
  await dana.waitForURL(/\/chat\//, { timeout: 15000 });
  await dana.getByTestId('share-address').click();
  await dana.getByTestId('pickup-address').fill('הרצל 5');
  await dana.getByTestId('send-address').click();
  await visible(dana, '[data-testid="address-card"]').waitFor();
  await yossi.goto(BASE + '/messages');
  await text(yossi, 'דנה').click();
  await visible(yossi, '[data-testid="address-card"]').waitFor({ timeout: 15000 });
  await text(yossi, 'הרצל 5, רמת גן').waitFor();
  await visible(yossi, '[data-testid="open-waze"]').click();
  const opened = await yossi.evaluate(() => window.__opened);
  expect(
    opened.some((u) => u.startsWith('https://waze.com/ul?q=') && u.includes(encodeURIComponent('הרצל 5'))),
    'waze: ' + opened,
  );
  await shot(yossi, 'tour-06-wanted-address');
  ok('request flow: the person who has it sends a typed address; Waze opens it: ' + opened.at(-1));

  // ── 8. Profile and everything under it ──────────────────────────────
  await dana.goto(BASE + '/profile');
  await text(dana, 'דנה').waitFor();
  await text(dana, 'שידה 3 מגירות').waitFor();
  await shot(dana, 'tour-07-profile');
  await dana.getByText('עריכת פרופיל', { exact: true }).click();
  await dana
    .getByLabel('קצת עליי')
    .fill('אוהבת למסור 💚')
    .catch(async () => {
      await visible(dana, 'textarea').fill('אוהבת למסור 💚');
    });
  await dana.getByText('שמירה', { exact: true }).click();
  await dana.goto(BASE + '/profile');
  await text(dana, 'אוהבת למסור 💚').waitFor({ timeout: 10000 });
  ok('profile shows my items; editing the bio works');

  await dana.getByText('הפרופיל הציבורי שלי').click();
  await text(dana, 'מוסר/ת עכשיו').waitFor();
  await dana.goto(BASE + '/alerts');
  await dana.getByTestId('alert-query').fill('ספרים');
  await dana.getByTestId('save-alert').click();
  await text(dana, 'עד 3 ק״מ', true).waitFor();
  await dana.getByLabel('מחיקה').first().click();
  await dana.getByText('אין עדיין התראות.').waitFor();
  await dana.goto(BASE + '/notifications');
  await text(dana, 'יוסי', false).waitFor({ timeout: 10000 });
  await shot(dana, 'tour-08-notifications');
  await dana.goto(BASE + '/communities');
  await dana.getByText('פתיחת קהילה חדשה').waitFor();
  await dana.goto(BASE + '/legal/privacy');
  await dana.getByText(/המיקום והכתובת שלך/).waitFor();
  expect(!(await dana.getByText('בינה מלאכותית').count()), 'AI still mentioned in privacy policy');
  await dana.goto(BASE + '/legal/terms');
  await dana.getByText(/למסירה בחינם בלבד/).waitFor();
  ok('public profile, alerts (add + delete), notifications, communities, privacy (no AI), terms');

  // Edit and remove an item.
  await dana.goto(itemUrl.replace('/item/', '/item/edit/'));
  await dana.getByTestId('save-item').waitFor({ timeout: 15000 });
  await visible(dana, 'input').fill('שידה 3 מגירות — עץ מלא');
  await dana.getByTestId('save-item').click();
  await dana.waitForURL(/\/item\/[^/]+$/, { timeout: 15000 });
  await text(dana, 'שידה 3 מגירות — עץ מלא').waitFor({ timeout: 10000 });
  ok('editing the title works');

  // Sign out and back in.
  await dana.goto(BASE + '/profile');
  await dana.getByText('התנתקות', { exact: true }).click();
  await dana.getByText('התחברות / הרשמה').waitFor({ timeout: 10000 });
  await signIn(dana, `dana.${run}@example.com`);
  await dana.waitForURL(BASE + '/', { timeout: 15000 });
  await dana.goto(BASE + '/profile');
  await text(dana, 'אוהבת למסור 💚').waitFor({ timeout: 10000 });
  ok('sign out, then sign back in to the same profile');

  // Delete an account.
  await rina.goto(BASE + '/profile');
  rina.once('dialog', (d) => d.accept());
  await rina.getByText('מחיקת החשבון', { exact: true }).click();
  await rina.getByText('התחברות / הרשמה').or(rina.getByText('GiveBack')).first().waitFor({ timeout: 15000 });
  ok('deleting an account signs out');

  await browser.close();
  console.log('ALL SCREENS PASSED');
})().catch(async (e) => {
  console.error('FAILED', e.message.split('\n')[0]);
  await Promise.all(pages.map((p, i) => shot(p, `tour-failure-${i}`).catch(() => {})));
  process.exit(1);
});
