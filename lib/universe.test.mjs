// Offline checks on the scan universes and batching. Run with npm test.
import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_UNIVERSE, SCAN_BATCH_SIZE, UNIVERSES, batchSymbols, getUniverse } from './universe.js';
import { toStooqSymbol } from './providers/stooq.js';
import { normaliseSymbol } from './yahoo.js';

test('every universe is non-empty and free of duplicates', () => {
    for (const [key, universe] of Object.entries(UNIVERSES)) {
        assert.ok(universe.symbols.length > 0, `${key} is empty`);
        assert.ok(universe.label && universe.description, `${key} is missing copy`);
        const unique = new Set(universe.symbols);
        assert.equal(unique.size, universe.symbols.length, `${key} contains duplicate symbols`);
    }
});

test('every symbol survives validation and maps to a Stooq ticker', () => {
    // A symbol the scan cannot resolve would silently fail on every run, so
    // catch it here rather than in production.
    for (const [key, universe] of Object.entries(UNIVERSES)) {
        for (const symbol of universe.symbols) {
            assert.equal(normaliseSymbol(symbol), symbol, `${key}: ${symbol} fails symbol validation`);
            assert.ok(toStooqSymbol(symbol), `${key}: ${symbol} has no Stooq mapping`);
        }
    }
});

test('getUniverse falls back to the default for an unknown key', () => {
    assert.equal(getUniverse('mega').label, UNIVERSES.mega.label);
    assert.equal(getUniverse('nonsense').label, UNIVERSES[DEFAULT_UNIVERSE].label);
    assert.equal(getUniverse(undefined).label, UNIVERSES[DEFAULT_UNIVERSE].label);
});

test('batchSymbols splits without losing or duplicating a symbol', () => {
    const symbols = Array.from({ length: 100 }, (_, i) => `S${i}`);
    const batches = batchSymbols(symbols);

    assert.ok(batches.every((batch) => batch.length <= SCAN_BATCH_SIZE));
    assert.deepEqual(batches.flat(), symbols);
});

test('batchSymbols handles an exact multiple and an empty list', () => {
    assert.equal(batchSymbols(Array.from({ length: 24 }, (_, i) => i), 12).length, 2);
    assert.deepEqual(batchSymbols([]), []);
});

test('no batch exceeds what the scan endpoint accepts', () => {
    // The route caps each request at SCAN_BATCH_SIZE; a larger batch would be
    // silently truncated and those symbols would never be scanned.
    for (const universe of Object.values(UNIVERSES)) {
        for (const batch of batchSymbols(universe.symbols)) {
            assert.ok(batch.length <= SCAN_BATCH_SIZE);
        }
    }
});
