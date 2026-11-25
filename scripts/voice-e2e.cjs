// End-to-end check of the voice page in a real browser. The page itself runs
// unchanged; the browser's speech recognition and speech synthesis are replaced
// with recorders, and /api/voice is answered by a stub, so the test checks the
// page's own flow: what is heard is sent, the reply is shown and read aloud,
// the chat survives a reload, and a missing microphone is handled.
//
// Run with the dev server on BASE_URL (default http://localhost:3100):
//   node scripts/voice-e2e.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';
const SHOTS = process.env.SHOTS_DIR || '/tmp/claude-0/voice-shots';
fs.mkdirSync(SHOTS, { recursive: true });

// Runs in the page before any site script. Replaces the browser's microphone
// recognizer and speech output with fakes the test can drive.
const FAKE_SPEECH = `
(() => {
    window.__heard = [];        // every recognition session started
    window.__spoken = [];       // every text handed to speech synthesis
    window.__phrases = [];      // queue of phrases the fake microphone "hears"
    class FakeRecognition {
        constructor() { this.lang = ''; this.interimResults = false; this.continuous = false; this.maxAlternatives = 1; }
        start() {
            window.__heard.push(this);
            setTimeout(() => this.onstart && this.onstart(), 10);
            const phrase = window.__phrases.shift();
            setTimeout(() => {
                if (phrase) {
                    const words = phrase.split(' ');
                    const half = words.slice(0, Math.ceil(words.length / 2)).join(' ');
                    const interim = { isFinal: false, 0: { transcript: half } };
                    this.onresult && this.onresult({ resultIndex: 0, results: [interim] });
                    const final = { isFinal: true, 0: { transcript: phrase } };
                    this.onresult && this.onresult({ resultIndex: 0, results: [final] });
                }
                this.onend && this.onend();
            }, 60);
        }
        stop() { this.onend && this.onend(); }
        abort() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeRecognition });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: FakeRecognition });

    class FakeUtterance { constructor(text) { this.text = text; this.lang = ''; } }
    window.SpeechSynthesisUtterance = FakeUtterance;
    // defineProperty, not assignment: the browser's own speechSynthesis is a
    // read-only property, so a plain assignment would be silently ignored.
    Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
            speak(utterance) {
                window.__spoken.push(utterance.text);
                setTimeout(() => { utterance.onstart && utterance.onstart(); }, 5);
                setTimeout(() => { utterance.onend && utterance.onend(); }, 40);
            },
            cancel() {},
            speaking: false
        }
    });
})();
`;

const failures = [];
function check(name, condition, detail = '') {
    const mark = condition ? 'PASS' : 'FAIL';
    console.log(`${mark}  ${name}${detail ? `  (${detail})` : ''}`);
    if (!condition) failures.push(name);
}

// Stub for /api/voice: answers by the last user message and records what was sent.
function stubApi(page, { replies = {}, status = 200, sent = [] } = {}) {
    return page.route('**/api/voice', async (route) => {
        const body = route.request().postDataJSON();
        sent.push(body);
        if (status !== 200) {
            return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: 'צריך להתחבר כדי להמשיך.' }) });
        }
        const reply = replies[body.message] ?? `תשובה לגבי: ${body.message}`;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply, toolCalls: [] }) });
    });
}

async function main() {
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    try {
        // --- Desktop: voice flow -------------------------------------------
        const context = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 800 } });
        await context.addInitScript(FAKE_SPEECH);
        const page = await context.newPage();
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        const sent = [];
        await stubApi(page, {
            sent,
            replies: {
                'כמה זה שתים עשרה ועוד שלוש כפול ארבע': 'התוצאה היא שישים.',
                'מה השעה?': 'השעה עכשיו שתיים בצהריים.',
                'מה נשמע': 'הכל טוב, תודה ששאלת.'
            }
        });

        await page.goto(`${BASE_URL}/voice`, { waitUntil: 'networkidle' });
        check('page loads and shows the ready status', (await page.getByTestId('status').textContent()).includes('מוכן'));
        check('microphone button is enabled when speech is supported', await page.getByTestId('mic').isEnabled());

        // Voice turn 1: speak, see the answer, hear the answer.
        await page.evaluate(() => window.__phrases.push('כמה זה שתים עשרה ועוד שלוש כפול ארבע'));
        await page.getByTestId('mic').click();
        await page.getByTestId('message').nth(1).waitFor({ timeout: 10000 });
        const firstTexts = await page.getByTestId('message').allTextContents();
        check('spoken question is shown as the user message', firstTexts[0] === 'כמה זה שתים עשרה ועוד שלוש כפול ארבע', firstTexts[0]);
        check('reply is shown under it', firstTexts[1] === 'התוצאה היא שישים.', firstTexts[1]);
        check('the question was sent to the agent as text', sent[0]?.message === 'כמה זה שתים עשרה ועוד שלוש כפול ארבע');
        check('first turn sent no earlier history', Array.isArray(sent[0]?.history) && sent[0].history.length === 0);
        await page.waitForFunction(() => window.__spoken.length === 1);
        const spoken = await page.evaluate(() => window.__spoken);
        check('reply is read aloud in Hebrew', spoken[0] === 'התוצאה היא שישים.', spoken[0]);

        // Text turn with history: the earlier turn is sent back as context.
        await page.getByTestId('message-input').fill('מה השעה?');
        await page.getByTestId('message-input').press('Enter');
        await page.getByText('השעה עכשיו שתיים בצהריים.').waitFor({ timeout: 10000 });
        check('second turn sends the earlier exchange as history', sent[1]?.history?.length === 2, `history length ${sent[1]?.history?.length}`);
        check('send button clears the input', (await page.getByTestId('message-input').inputValue()) === '');

        // The chat survives a reload (saved in this browser).
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByTestId('message').nth(3).waitFor({ timeout: 10000 });
        const afterReload = await page.getByTestId('message').count();
        check('chat is still there after reload', afterReload === 4, `${afterReload} messages`);
        await page.screenshot({ path: path.join(SHOTS, 'desktop-chat.png') });

        // Conversation mode: after a reply the page listens again by itself.
        await page.getByTestId('conversation-toggle').check();
        const startsBefore = await page.evaluate(() => window.__heard.length);
        await page.evaluate(() => window.__phrases.push('מה נשמע'));
        await page.getByTestId('mic').click();
        await page.getByText('הכל טוב, תודה ששאלת.').waitFor({ timeout: 10000 });
        await page.waitForFunction((n) => window.__heard.length >= n + 2, startsBefore, { timeout: 10000 });
        const startsAfter = await page.evaluate(() => window.__heard.length);
        check('conversation mode listens again after the reply', startsAfter >= startsBefore + 2, `${startsBefore} -> ${startsAfter} listens`);
        await page.getByTestId('conversation-toggle').uncheck();

        // Server refuses (not signed in): the error and a sign-in link show, the question is kept.
        await page.unroute('**/api/voice');
        await stubApi(page, { status: 401, sent: [] });
        await page.getByTestId('message-input').fill('שאלה שתיכשל');
        await page.getByTestId('message-input').press('Enter');
        await page.getByTestId('error').waitFor({ timeout: 10000 });
        const errorText = await page.getByTestId('error').textContent();
        check('sign-in error is shown with a link to sign in', errorText.includes('צריך להתחבר') && (await page.getByTestId('error').getByRole('link').count()) === 1);
        check('the failed question stays in the chat', (await page.getByText('שאלה שתיכשל').count()) === 1);

        check('no uncaught page errors', pageErrors.length === 0, pageErrors.join(' | '));
        await context.close();

        // --- Phone: layout fits and nothing scrolls sideways ---------------
        const phone = await browser.newContext({
            locale: 'he-IL',
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true
        });
        await phone.addInitScript(FAKE_SPEECH);
        const phonePage = await phone.newPage();
        await stubApi(phonePage, { replies: { 'מה השעה?': 'השעה עכשיו שתיים בצהריים.' } });
        await phonePage.goto(`${BASE_URL}/voice`, { waitUntil: 'networkidle' });
        await phonePage.getByTestId('message-input').fill('מה השעה?');
        await phonePage.getByTestId('message-input').press('Enter');
        await phonePage.getByText('השעה עכשיו שתיים בצהריים.').waitFor({ timeout: 10000 });
        const overflow = await phonePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check('phone layout has no horizontal scroll', overflow <= 0, `overflow ${overflow}px`);
        await phonePage.screenshot({ path: path.join(SHOTS, 'phone-chat.png') });
        await phone.close();

        // --- Browser without speech recognition: typing still works ---------
        const plain = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 800 } });
        await plain.addInitScript(() => {
            Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
            Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
        });
        const plainPage = await plain.newPage();
        await stubApi(plainPage, {});
        await plainPage.goto(`${BASE_URL}/voice`, { waitUntil: 'networkidle' });
        check('mic is disabled without speech recognition', await plainPage.getByTestId('mic').isDisabled());
        check('a note explains the missing microphone', (await plainPage.getByTestId('support-note').count()) === 1);
        await plainPage.getByTestId('message-input').fill('היי');
        await plainPage.getByTestId('message-input').press('Enter');
        await plainPage.getByText('תשובה לגבי: היי').waitFor({ timeout: 10000 });
        check('typing still works without a microphone', true);
        await plain.close();
    } finally {
        await browser.close();
    }

    console.log('');
    if (failures.length) {
        console.log(`${failures.length} check(s) failed:`);
        for (const name of failures) console.log(`  - ${name}`);
        process.exitCode = 1;
    } else {
        console.log('All browser checks passed.');
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
