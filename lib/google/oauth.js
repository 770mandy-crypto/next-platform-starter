// Connecting a person's Google account: the consent link, the code exchange,
// and short-lived access tokens from the stored refresh token. The state value
// ties the browser's return to the person who started it and expires quickly.

import { randomBytes } from 'node:crypto';
import { getDb } from '../pilot/db.js';
import { sha256 } from '../pilot/auth.js';
import { open, seal, tokenKey } from './seal.js';

// Gmail: read the inbox and send. Calendar: read and create events.
export const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events'
];

export const STATE_TTL_MS = 10 * 60_000;
const TIMEOUT_MS = 20_000;
const tokenHost = () => (process.env.GOOGLE_OAUTH_HOST || 'https://oauth2.googleapis.com').replace(/\/$/, '');

export class GoogleError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

export function isGoogleConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && tokenKey());
}

export function buildAuthUrl(state) {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES.join(' '),
        state,
        access_type: 'offline',
        // Asks for a refresh token every time, so a reconnect always yields one.
        prompt: 'consent'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function postToken(body, fetchImpl) {
    const response = await fetchImpl(`${tokenHost()}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new GoogleError('Google לא אישר את החיבור. נסו שוב.', 502);
    return data;
}

export async function exchangeCode(code, fetchImpl = fetch) {
    return postToken(
        {
            grant_type: 'authorization_code',
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI
        },
        fetchImpl
    );
}

// A short-lived access token for one user, from their stored refresh token.
export async function accessTokenFor(userId, fetchImpl = fetch) {
    const sealed = await loadRefreshToken(userId);
    if (!sealed) throw new GoogleError('החשבון של Google עדיין לא מחובר.', 409);
    const data = await postToken(
        {
            grant_type: 'refresh_token',
            refresh_token: open(sealed),
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET
        },
        fetchImpl
    );
    return data.access_token;
}

const accountKey = (userId) => `google/accounts/${userId}`;

export async function saveRefreshToken(userId, refreshToken) {
    await (await getDb()).set(accountKey(userId), { sealed: seal(refreshToken), connectedAt: Date.now() });
}

export async function loadRefreshToken(userId) {
    return (await (await getDb()).get(accountKey(userId)))?.sealed ?? null;
}

export async function isConnected(userId) {
    return Boolean(await loadRefreshToken(userId));
}

export async function disconnect(userId) {
    await (await getDb()).delete(accountKey(userId));
}

// States are stored by hash, so a leaked database cannot be replayed as a login.
const stateKey = (state) => `google/states/${sha256(state)}`;

export async function createState(userId, now = Date.now()) {
    const state = randomBytes(24).toString('base64url');
    await (await getDb()).set(stateKey(state), { userId, at: now });
    return state;
}

// Returns the user the state was issued to, or null. A state is used once.
export async function consumeState(state, now = Date.now()) {
    if (typeof state !== 'string' || !state) return null;
    const db = await getDb();
    const record = await db.get(stateKey(state));
    await db.delete(stateKey(state));
    if (!record || now - record.at > STATE_TTL_MS) return null;
    return record.userId;
}
