// Offline checks for the sales agent: no database, no network, no model.
import assert from 'node:assert/strict';
import test from 'node:test';
import twilio from 'twilio';

import { allowedNumbers, checkReply, extractNumbers, trimForSpeech } from './sales/guardrails.js';
import { checkOutboundAllowed, isStopRequest, withinCallingWindow } from './sales/compliance.js';
import { computeSlots } from './sales/calendar.js';
import { mapCsvRows, parseCsv } from './sales/leads.js';
import { normalisePhone } from './sales/phone.js';
import { greeting, buildSystemPrompt } from './sales/prompt.js';
import { escapeXml, gatherTwiml, isValidTwilioRequest, twilioSignature } from './sales/twilio.js';
import { pickOutcome } from './sales/calls.js';
import { zonedToUtc, localParts } from './sales/time.js';
import { BusinessSchema, parseOrThrow } from './sales/schemas.js';
import { estimateAiCost } from './sales/agent.js';

const business = parseOrThrow(BusinessSchema, {
    name: 'Test Clinic',
    language: 'he-IL',
    timezone: 'Asia/Jerusalem',
    business_hours: { 0: [{ start: '09:00', end: '11:00' }] },
    appointment_minutes: 30,
    outbound_enabled: true
});

// --- Guardrails ------------------------------------------------------------

test('numbers are extracted with thousands separators and phone dashes joined', () => {
    assert.deepEqual(extractNumbers('המחיר 1,250 ש"ח, או 280.5'), ['1250', '280.5']);
    assert.deepEqual(extractNumbers('התקשרו 050-1234567'), ['501234567']);
});

test('a reply with a price not in the knowledge is blocked; a known price passes', () => {
    const allowed = allowedNumbers(['{"price":280}', 'customer said 2 sessions']);
    assert.deepEqual(checkReply('הטיפול עולה 280 שקל', { allowed }), []);
    const problems = checkReply('הטיפול עולה 350 שקל', { allowed });
    assert.equal(problems[0].type, 'unverified_number');
    assert.deepEqual(problems[0].values, ['350']);
    // Small counts are ordinary speech.
    assert.deepEqual(checkReply('אפשר 2 או 3 טיפולים', { allowed }), []);
});

test('a reply that claims to be human is blocked', () => {
    const allowed = new Set();
    assert.equal(checkReply('אני בן אדם, אל דאגה', { allowed })[0].type, 'claims_human');
    assert.equal(checkReply("Don't worry, I'm a real person", { allowed })[0].type, 'claims_human');
    assert.deepEqual(checkReply('אני עוזר AI של העסק', { allowed }), []);
});

test('speech text is stripped of markdown and kept short', () => {
    assert.equal(trimForSpeech('**שלום**  לך'), 'שלום לך');
    const long = 'משפט ארוך. '.repeat(100);
    assert.ok(trimForSpeech(long).length <= 600);
});

// --- Contact rules ---------------------------------------------------------

test('stop requests are recognised in Hebrew and English, without false alarms', () => {
    for (const text of ['אל תתקשרו אליי יותר', 'תורידו אותי מהרשימה', "please don't call me", 'Stop calling me']) {
        assert.ok(isStopRequest(text), text);
    }
    for (const text of ['אני לא יכול להתקשר מחר', 'כן, מתאים לי', 'call me tomorrow']) {
        assert.ok(!isStopRequest(text), text);
    }
});

test('the calling window is evaluated in the lead’s own time zone', () => {
    const window = { start: '09:00', end: '20:00', days: [0, 1, 2, 3, 4] };
    // Sunday 2026-05-03 07:00 UTC = 10:00 in Israel, 03:00 in New York.
    const at = new Date('2026-05-03T07:00:00Z');
    assert.equal(withinCallingWindow(window, 'Asia/Jerusalem', at), true);
    assert.equal(withinCallingWindow(window, 'America/New_York', at), false);
    // Saturday is not in the window.
    assert.equal(withinCallingWindow(window, 'Asia/Jerusalem', new Date('2026-05-02T07:00:00Z')), false);
});

test('every outbound rule blocks a call on its own', () => {
    const lead = { consent_call: true, status: 'new', attempts: 0, timezone: 'Asia/Jerusalem', next_call_at: null };
    const now = new Date('2026-05-03T07:00:00Z');
    const base = { business, lead, onDoNotCallList: false, callsLastHour: 0, now };
    assert.equal(checkOutboundAllowed(base), null);
    assert.equal(checkOutboundAllowed({ ...base, business: { ...business, outbound_enabled: false } }), 'outbound_disabled');
    assert.equal(checkOutboundAllowed({ ...base, onDoNotCallList: true }), 'do_not_call');
    assert.equal(checkOutboundAllowed({ ...base, lead: { ...lead, consent_call: false } }), 'no_consent');
    assert.equal(checkOutboundAllowed({ ...base, lead: { ...lead, status: 'do_not_call' } }), 'status_blocked');
    assert.equal(checkOutboundAllowed({ ...base, lead: { ...lead, attempts: 3 } }), 'max_attempts');
    assert.equal(
        checkOutboundAllowed({ ...base, lead: { ...lead, next_call_at: '2026-05-04T07:00:00Z' } }),
        'not_due'
    );
    assert.equal(checkOutboundAllowed({ ...base, now: new Date('2026-05-03T20:00:00Z') }), 'outside_window');
    assert.equal(checkOutboundAllowed({ ...base, callsLastHour: 20 }), 'rate_limited');
});

// --- Time and calendar -----------------------------------------------------

test('zoned times convert correctly on both sides of a DST change', () => {
    // Israel: UTC+2 in winter, UTC+3 in summer.
    assert.equal(zonedToUtc('2026-01-15', '09:00', 'Asia/Jerusalem').toISOString(), '2026-01-15T07:00:00.000Z');
    assert.equal(zonedToUtc('2026-07-15', '09:00', 'Asia/Jerusalem').toISOString(), '2026-07-15T06:00:00.000Z');
    assert.equal(localParts(new Date('2026-07-15T06:00:00Z'), 'Asia/Jerusalem').hhmm, '09:00');
});

test('slots follow opening hours, skip bookings and require notice', () => {
    const now = new Date('2026-05-03T05:00:00Z'); // Sunday 08:00 Israel
    const slots = computeSlots({ business, booked: [], now, days: 1 });
    assert.deepEqual(
        slots.map((s) => s.starts_at),
        ['2026-05-03T06:00:00.000Z', '2026-05-03T06:30:00.000Z', '2026-05-03T07:00:00.000Z', '2026-05-03T07:30:00.000Z']
    );
    const booked = [{ starts_at: '2026-05-03T06:30:00Z', ends_at: '2026-05-03T07:00:00Z' }];
    assert.equal(computeSlots({ business, booked, now, days: 1 }).length, 3);
    const later = new Date('2026-05-03T06:15:00Z'); // 09:15: the first hour is too soon
    assert.deepEqual(
        computeSlots({ business, booked: [], now: later, days: 1 }).map((s) => s.starts_at),
        ['2026-05-03T07:30:00.000Z']
    );
});

// --- Leads -----------------------------------------------------------------

test('CSV import handles quotes, Hebrew headers and consent columns', () => {
    const csv = '﻿שם,טלפון,הסכמה לשיחה,הערות\r\n"כהן, דנה",050-1234567,כן,"אמרה ""אולי"""\nיוסי,0527654321,,\n';
    const { leads, errors } = mapCsvRows(parseCsv(csv));
    assert.deepEqual(errors, []);
    assert.equal(leads.length, 2);
    assert.equal(leads[0].name, 'כהן, דנה');
    assert.equal(leads[0].consent_call, true);
    assert.equal(leads[0].notes, 'אמרה "אולי"');
    assert.equal(leads[1].consent_call, false);
    assert.equal(mapCsvRows(parseCsv('name\nx')).errors[0].error, 'missing phone column');
});

test('phone numbers normalise to E.164', () => {
    assert.equal(normalisePhone('050-123-4567', 'IL'), '+972501234567');
    assert.equal(normalisePhone('00972501234567'), '+972501234567');
    assert.equal(normalisePhone('(212) 555-0100', 'US'), '+12125550100');
    assert.equal(normalisePhone('12', 'IL'), null);
    assert.equal(normalisePhone('0501234567', 'ZZ'), null);
});

// --- Prompt and disclosure -------------------------------------------------

test('every opening line discloses that the agent is an AI', () => {
    for (const language of ['he-IL', 'en-US']) {
        for (const direction of ['inbound', 'outbound']) {
            const line = greeting({ business: { ...business, language }, call: { direction }, lead: null });
            assert.match(line, /AI/, `${language} ${direction}`);
        }
    }
});

test('only the knowledge passed in reaches the system prompt', () => {
    const prompt = buildSystemPrompt(business, [{ kind: 'price', title: 'Visit', content: '', price: 280, currency: 'ILS' }]);
    assert.match(prompt, /Visit \| price: 280 ILS/);
    assert.match(prompt, /Never invent prices/);
});

// --- Telephony -------------------------------------------------------------

test('Twilio signatures match the official Twilio library', () => {
    const token = 'test-auth-token';
    const url = 'https://example.com/api/sales/voice/turn?call=abc&silence=1';
    const params = { CallSid: 'CA123', SpeechResult: 'שלום, כמה עולה טיפול?', From: '+972501234567' };
    const signature = twilioSignature(token, url, params);
    assert.equal(twilio.validateRequest(token, signature, url, params), true);
    assert.equal(isValidTwilioRequest({ authToken: token, signature, url, params }), true);
    assert.equal(isValidTwilioRequest({ authToken: token, signature, url, params: { ...params, From: '+1' } }), false);
    assert.equal(isValidTwilioRequest({ authToken: token, signature: null, url, params }), false);
});

test('TwiML escapes what the agent says and listens with barge-in', () => {
    assert.equal(escapeXml('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
    const xml = gatherTwiml({ text: 'מחיר <280>', business, actionUrl: 'https://x/turn?call=1' });
    assert.match(xml, /<Gather input="speech" language="he-IL"[^>]*bargeIn="true"/);
    assert.match(xml, /מחיר &lt;280&gt;/);
    assert.match(xml, /<Redirect method="POST">https:\/\/x\/turn\?call=1&amp;silence=1<\/Redirect>/);
});

// --- Outcomes and cost -----------------------------------------------------

test('the strongest outcome names the call', () => {
    assert.equal(pickOutcome(['lead_captured', 'meeting_booked'], 'info_only'), 'meeting_booked');
    assert.equal(pickOutcome(['meeting_booked'], 'do_not_call'), 'do_not_call');
    assert.equal(pickOutcome([], null), null);
});

test('AI cost is estimated from token usage', () => {
    const cost = estimateAiCost({ input: 1_000_000, output: 100_000, cacheRead: 0, cacheWrite: 0 }, 'claude-opus-5-5');
    assert.equal(cost, 4 + 2);
});
