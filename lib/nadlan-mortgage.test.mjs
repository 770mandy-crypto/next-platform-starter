import assert from 'node:assert/strict';
import test from 'node:test';
import { affordability, loanForPayment, monthlyPayment, planPurchase } from './nadlan/mortgage.js';

test('annuity payment matches the textbook formula and inverts', () => {
    // 1,000,000 at 5% for 25 years ≈ 5,846 a month.
    assert.equal(Math.round(monthlyPayment(1_000_000, 5, 25)), 5846);
    assert.equal(Math.round(monthlyPayment(120_000, 0, 10)), 1000);
    assert.equal(monthlyPayment(0, 5, 25), 0);
    assert.ok(Math.abs(loanForPayment(5846, 5, 25) - 1_000_000) < 100);
});

test('planPurchase applies the financing cap per buyer type', () => {
    const first = planPurchase({ price: 2_000_000, equity: 500_000, buyerType: 'first', rate: 5, years: 25 });
    assert.equal(first.loan, 1_500_000);
    assert.equal(first.ltv, 75);
    assert.ok(first.ok);
    const investor = planPurchase({ price: 2_000_000, equity: 500_000, buyerType: 'investor' });
    assert.equal(investor.minEquity, 1_000_000);
    assert.ok(!investor.ok && investor.problems[0].includes('הון עצמי'));
});

test('planPurchase flags a payment too large for the income', () => {
    const tight = planPurchase({ price: 2_000_000, equity: 600_000, netIncome: 12_000, rate: 5, years: 25 });
    assert.ok(tight.paymentShare > 50);
    assert.ok(tight.problems.some((p) => p.includes('חצי')));
    const fine = planPurchase({ price: 2_000_000, equity: 600_000, netIncome: 30_000, rate: 5, years: 25 });
    assert.ok(fine.ok);
});

test('affordability is the tighter of equity and income', () => {
    const byEquity = affordability({ equity: 400_000, buyerType: 'first' });
    assert.equal(byEquity.maxPrice, 1_600_000);
    assert.equal(byEquity.limitedBy, 'equity');
    const byIncome = affordability({ equity: 1_000_000, netIncome: 15_000, buyerType: 'first', rate: 5, years: 25 });
    assert.equal(byIncome.limitedBy, 'income');
    assert.ok(byIncome.maxPrice < 4_000_000);
    assert.ok(Math.abs(byIncome.monthlyPayment - 15_000 * 0.33) < 60);
    // Bad inputs fall back to safe defaults.
    assert.equal(affordability({ equity: 100_000, buyerType: 'nope', years: 99 }).years, 30);
});
