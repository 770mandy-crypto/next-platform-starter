// Helpers for the web end-to-end test. See e2e/web-flow.cjs.
// Uses a globally installed Playwright (npm i -g playwright) so the app does not
// carry a browser dependency.
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const BASE = 'http://localhost:8082';
const MAILPIT = 'http://127.0.0.1:54324';
const SP = __dirname;
const SHOTS = process.env.SHOTS_DIR ?? require('os').tmpdir();

async function latestCode(email) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)).json();
    if (list.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
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
  await page.getByTestId('send-code').click();
  const code = await latestCode(email);
  await page.getByTestId('code-input').fill(code);
  await page.getByTestId('verify-code').click();
}

const shot = (page, name) => page.screenshot({ path: `${SHOTS}/app-${name}.png` });

module.exports = { chromium, BASE, SP, newUser, signIn, shot };
