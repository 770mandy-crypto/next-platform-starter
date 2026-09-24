// Helpers for the web end-to-end test. See e2e/web-flow.cjs.
// Uses a globally installed Playwright (npm i -g playwright) so the app does not
// carry a browser dependency.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const BASE = 'http://localhost:8082';
const MAILPIT = 'http://127.0.0.1:54324';
const SP = __dirname;
const SHOTS = process.env.SHOTS_DIR ?? require('os').tmpdir();

async function messageIds(email) {
  const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)).json();
  return (list.messages ?? []).map((m) => m.ID);
}

// Waits for a sign-in email that was not there before, and reads its code.
async function newCode(email, before) {
  for (let i = 0; i < 40; i++) {
    const fresh = (await messageIds(email)).filter((id) => !before.includes(id));
    if (fresh.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${fresh[0]}`)).json();
      const m = /\b(\d{6})\b/.exec(msg.Text);
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('no code email for ' + email);
}

async function newUser(browser, { geo }) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'he-IL',
    geolocation: geo,
    permissions: ['geolocation'],
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && !/favicon|ERR_|Failed to load resource/.test(m.text()) && console.log('CONSOLE', m.text().slice(0, 300)));
  // Capture navigation links (Waze / Google) instead of leaving the app.
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (url) => { window.__opened.push(String(url)); return null; };
  });
  return page;
}

async function signIn(page, email) {
  await page.goto(BASE + '/sign-in');
  await page.getByTestId('email-input').fill(email);
  const before = await messageIds(email);
  await page.getByTestId('send-code').click();
  const code = await newCode(email, before);
  await page.getByTestId('code-input').fill(code);
  await page.getByTestId('verify-code').click();
}

// Size of the first listing photo on the page once it has loaded — proves the
// picture shown is the uploaded file and not a placeholder.
async function firstPhoto(page) {
  const handle = await page.waitForFunction(
    () => {
      const img = [...document.querySelectorAll('img')].find((i) => i.src.includes('/item-photos/'));
      return img && img.complete && img.naturalWidth > 0 ? { src: img.src, w: img.naturalWidth, h: img.naturalHeight } : null;
    },
    null,
    { timeout: 15000 },
  );
  return handle.jsonValue();
}

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/app-${name}.png` });

module.exports = { chromium, BASE, SP, newUser, signIn, shot, firstPhoto };
