// Twilio telephony: webhook signature checks, TwiML responses, and the REST
// calls for placing outbound calls and sending SMS. Plain fetch, no SDK.
//
// Speech flows through Twilio's <Gather input="speech"> (speech-to-text) and
// <Say> (text-to-speech), so every turn is an ordinary HTTPS webhook and the
// app runs on serverless hosting. bargeIn lets the caller interrupt the agent.

import { createHmac, timingSafeEqual } from 'node:crypto';

export function isTwilioConfigured() {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.PUBLIC_BASE_URL);
}

// https://www.twilio.com/docs/usage/webhooks/webhooks-security
export function twilioSignature(authToken, url, params) {
    const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], url);
    return createHmac('sha1', authToken).update(Buffer.from(data, 'utf8')).digest('base64');
}

export function isValidTwilioRequest({ authToken, signature, url, params }) {
    if (!authToken || !signature) return false;
    const expected = Buffer.from(twilioSignature(authToken, url, params));
    const given = Buffer.from(String(signature));
    return expected.length === given.length && timingSafeEqual(expected, given);
}

// The URL Twilio signed is the public one, which a proxy or CDN may rewrite
// before it reaches us — so it is rebuilt from PUBLIC_BASE_URL.
export function publicUrl(request) {
    const url = new URL(request.url);
    return `${String(process.env.PUBLIC_BASE_URL).replace(/\/$/, '')}${url.pathname}${url.search}`;
}

export async function readTwilioForm(request) {
    const body = await request.text();
    if (body.length > 64_000) throw Object.assign(new Error('payload too large'), { status: 413 });
    const params = Object.fromEntries(new URLSearchParams(body));
    const valid =
        process.env.TWILIO_SKIP_SIGNATURE === 'true' && process.env.NODE_ENV !== 'production'
            ? true
            : isValidTwilioRequest({
                  authToken: process.env.TWILIO_AUTH_TOKEN,
                  signature: request.headers.get('x-twilio-signature'),
                  url: publicUrl(request),
                  params
              });
    if (!valid) throw Object.assign(new Error('invalid Twilio signature'), { status: 403 });
    return params;
}

// --- TwiML -----------------------------------------------------------------

export function escapeXml(value) {
    return String(value ?? '').replace(
        /[<>&'"]/g,
        (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]
    );
}

// Default Twilio <Say> voices per language. Override per business (the
// "voice" field) with any voice name your Twilio account supports.
const DEFAULT_VOICES = { 'he-IL': 'Google.he-IL-Standard-A', 'en-US': 'Polly.Joanna-Neural', 'en-GB': 'Polly.Amy-Neural' };

export function sayVerb(text, business) {
    const voice = business.voice || DEFAULT_VOICES[business.language] || '';
    return `<Say language="${escapeXml(business.language)}"${voice ? ` voice="${escapeXml(voice)}"` : ''}>${escapeXml(text)}</Say>`;
}

export function twiml(inner) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

// Speak, then listen for the reply; on silence, come back to the turn URL.
export function gatherTwiml({ text, business, actionUrl }) {
    return twiml(
        `<Gather input="speech" language="${escapeXml(business.language)}" speechTimeout="auto" bargeIn="true" ` +
            `actionOnEmptyResult="true" action="${escapeXml(actionUrl)}" method="POST">${sayVerb(text, business)}</Gather>` +
            `<Redirect method="POST">${escapeXml(`${actionUrl}&silence=1`)}</Redirect>`
    );
}

export function hangupTwiml({ text, business }) {
    return twiml(`${text ? sayVerb(text, business) : ''}<Hangup/>`);
}

export function transferTwiml({ text, business, to }) {
    return twiml(`${sayVerb(text, business)}<Dial>${escapeXml(to)}</Dial>`);
}

export function xmlResponse(xml) {
    return new Response(xml, { headers: { 'content-type': 'text/xml; charset=utf-8' } });
}

// --- REST ------------------------------------------------------------------

function apiBase() {
    return process.env.TWILIO_API_HOST || 'https://api.twilio.com';
}

async function twilioPost(path, form) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await fetch(`${apiBase()}/2010-04-01/Accounts/${sid}/${path}`, {
        method: 'POST',
        headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form),
        signal: AbortSignal.timeout(15_000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw Object.assign(new Error(`Twilio ${response.status}: ${data.message ?? 'request failed'}`), {
            status: 502,
            twilioCode: data.code
        });
    }
    return data;
}

export function createOutboundCall({ to, from, callId }) {
    const base = String(process.env.PUBLIC_BASE_URL).replace(/\/$/, '');
    return twilioPost('Calls.json', {
        To: to,
        From: from,
        Url: `${base}/api/sales/voice/outbound?call=${callId}`,
        Method: 'POST',
        StatusCallback: `${base}/api/sales/voice/status?call=${callId}`,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: 'completed',
        // Answering machines are detected so the agent never talks to voicemail.
        MachineDetection: 'Enable',
        Timeout: '25'
    });
}

export function sendSms({ to, from, body }) {
    return twilioPost('Messages.json', { To: to, From: from, Body: body });
}
