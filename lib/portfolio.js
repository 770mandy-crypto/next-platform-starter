// The personal area's data: which symbols a signed-in user is tracking or
// holding. One Netlify Blobs record per user, keyed by the same normalised
// email lib/users.js uses, so the two stores can never disagree about who
// "you" are.

import { getStore } from '@netlify/blobs';
import { normaliseSymbol } from './yahoo.js';
import { normalizeEmail } from './users.js';

const STORE_NAME = 'portfolios';
const MAX_HOLDINGS = 200;
const MAX_NOTE_LENGTH = 280;

export function portfolioStore() {
    return getStore({ name: STORE_NAME, consistency: 'strong' });
}

// Pure validation/shaping, kept separate from the store I/O so it can be
// unit-tested without a Netlify Blobs context. Throws with a short reason
// code the API route turns into a Hebrew message.
export function validateHoldingInput({ symbol, shares, avgPrice, note } = {}) {
    const normalised = normaliseSymbol(symbol);
    if (!normalised) throw new Error('invalid-symbol');

    const holding = { symbol: normalised, addedAt: new Date().toISOString() };

    if (shares !== undefined && shares !== null && shares !== '') {
        const parsed = Number(shares);
        if (!Number.isFinite(parsed) || parsed < 0) throw new Error('invalid-shares');
        holding.shares = parsed;
    }

    if (avgPrice !== undefined && avgPrice !== null && avgPrice !== '') {
        const parsed = Number(avgPrice);
        if (!Number.isFinite(parsed) || parsed < 0) throw new Error('invalid-price');
        holding.avgPrice = parsed;
    }

    if (typeof note === 'string' && note.trim()) {
        holding.note = note.trim().slice(0, MAX_NOTE_LENGTH);
    }

    return holding;
}

export function toCsv(holdings) {
    const header = ['Symbol', 'Shares', 'AvgPrice', 'Note', 'AddedAt'];
    const escape = (value) => {
        const str = value === undefined || value === null ? '' : String(value);
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = holdings.map((h) => [h.symbol, h.shares ?? '', h.avgPrice ?? '', h.note ?? '', h.addedAt ?? '']);
    return [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

export async function getPortfolio(email, store = portfolioStore()) {
    const key = normalizeEmail(email);
    if (!key) return [];
    const data = await store.get(key, { type: 'json' });
    return Array.isArray(data) ? data : [];
}

export async function addHolding(email, input, store = portfolioStore()) {
    const key = normalizeEmail(email);
    if (!key) throw new Error('not-signed-in');

    const holding = validateHoldingInput(input);
    const current = await getPortfolio(key, store);

    if (current.some((item) => item.symbol === holding.symbol)) {
        throw new Error('already-tracked');
    }
    if (current.length >= MAX_HOLDINGS) {
        throw new Error('list-full');
    }

    const next = [...current, holding];
    await store.setJSON(key, next);
    return next;
}

export async function removeHolding(email, symbol, store = portfolioStore()) {
    const key = normalizeEmail(email);
    if (!key) throw new Error('not-signed-in');

    const target = normaliseSymbol(symbol);
    const current = await getPortfolio(key, store);
    const next = current.filter((item) => item.symbol !== target);
    await store.setJSON(key, next);
    return next;
}
