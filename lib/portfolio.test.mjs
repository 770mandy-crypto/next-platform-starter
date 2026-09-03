// Offline verification of the personal watchlist: symbol/shares/price
// validation, CSV export, and the CRUD flow against an injected in-memory
// store rather than real Netlify Blobs.
import assert from 'node:assert/strict';
import test from 'node:test';

import { validateHoldingInput, toCsv, getPortfolio, addHolding, removeHolding } from './portfolio.js';

function fakeStore() {
    const data = new Map();
    return {
        async get(key) {
            return data.has(key) ? data.get(key) : null;
        },
        async setJSON(key, value) {
            data.set(key, value);
        }
    };
}

test('validateHoldingInput normalises the symbol and rejects an invalid one', () => {
    const holding = validateHoldingInput({ symbol: ' aapl ' });
    assert.equal(holding.symbol, 'AAPL');
    assert.ok(holding.addedAt);

    assert.throws(() => validateHoldingInput({ symbol: '' }), /invalid-symbol/);
    assert.throws(() => validateHoldingInput({ symbol: '$$$' }), /invalid-symbol/);
});

test('validateHoldingInput parses optional numeric fields and rejects negatives', () => {
    const holding = validateHoldingInput({ symbol: 'MSFT', shares: '10', avgPrice: '250.5', note: '  buy the dip  ' });
    assert.equal(holding.shares, 10);
    assert.equal(holding.avgPrice, 250.5);
    assert.equal(holding.note, 'buy the dip');

    assert.throws(() => validateHoldingInput({ symbol: 'MSFT', shares: '-1' }), /invalid-shares/);
    assert.throws(() => validateHoldingInput({ symbol: 'MSFT', avgPrice: 'not-a-number' }), /invalid-price/);
});

test('validateHoldingInput omits fields that were left blank', () => {
    const holding = validateHoldingInput({ symbol: 'NVDA' });
    assert.ok(!('shares' in holding));
    assert.ok(!('avgPrice' in holding));
    assert.ok(!('note' in holding));
});

test('toCsv produces a header row and escapes commas/quotes in notes', () => {
    const csv = toCsv([{ symbol: 'AAPL', shares: 5, avgPrice: 190.2, note: 'buy, "the" dip', addedAt: '2026-01-01' }]);
    const lines = csv.trim().split('\r\n');
    assert.equal(lines[0], 'Symbol,Shares,AvgPrice,Note,AddedAt');
    assert.equal(lines[1], 'AAPL,5,190.2,"buy, ""the"" dip",2026-01-01');
});

test('toCsv handles an empty portfolio', () => {
    assert.equal(toCsv([]), 'Symbol,Shares,AvgPrice,Note,AddedAt\r\n');
});

test('addHolding/removeHolding round-trip through getPortfolio, and reject a duplicate symbol', async () => {
    const store = fakeStore();
    const email = 'trader@example.com';

    assert.deepEqual(await getPortfolio(email, store), []);

    let holdings = await addHolding(email, { symbol: 'AAPL' }, store);
    assert.equal(holdings.length, 1);

    holdings = await addHolding(email, { symbol: 'msft' }, store);
    assert.equal(holdings.length, 2);

    await assert.rejects(() => addHolding(email, { symbol: 'AAPL' }, store), /already-tracked/);

    holdings = await removeHolding(email, 'AAPL', store);
    assert.deepEqual(
        holdings.map((h) => h.symbol),
        ['MSFT']
    );
});

test('portfolio functions throw without a signed-in email', async () => {
    const store = fakeStore();
    await assert.rejects(() => addHolding('', { symbol: 'AAPL' }, store), /not-signed-in/);
    await assert.rejects(() => removeHolding(null, 'AAPL', store), /not-signed-in/);
});
