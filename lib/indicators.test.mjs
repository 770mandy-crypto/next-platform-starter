// Offline verification of the indicator math and the scoring engine.
// Run with: node --test lib/indicators.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    annualisedVolatility,
    exponentialMovingAverageSeries,
    macd,
    maxDrawdown,
    percentChange,
    rangePosition,
    relativeStrengthIndex,
    simpleMovingAverage
} from './indicators.js';
import { analyseFundamentals, analyseTechnicals, combineScores } from './analysis.js';
import { fallbackNarration } from './bot.js';

// The canonical Wilder RSI worked example; the accepted result is 70.53.
const WILDER_CLOSES = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28
];

test('simpleMovingAverage averages the trailing window', () => {
    assert.equal(simpleMovingAverage([1, 2, 3, 4, 5], 5), 3);
    assert.equal(simpleMovingAverage([1, 2, 3, 4, 5], 2), 4.5);
});

test('simpleMovingAverage returns null without enough history', () => {
    assert.equal(simpleMovingAverage([1, 2], 5), null);
    assert.equal(simpleMovingAverage([], 5), null);
});

test('exponentialMovingAverageSeries seeds with the SMA and smooths forward', () => {
    const series = exponentialMovingAverageSeries([1, 2, 3, 4, 5], 3);
    assert.equal(series[0], 2); // SMA of 1,2,3
    assert.equal(series.length, 3); // seed + one value per remaining close
    assert.ok(series[2] > series[1] && series[1] > series[0]);
});

test('relativeStrengthIndex matches Wilder reference value', () => {
    const rsi = relativeStrengthIndex(WILDER_CLOSES, 14);
    assert.ok(Math.abs(rsi - 70.53) < 0.1, `expected ~70.53, got ${rsi}`);
});

test('relativeStrengthIndex pins to 100 when nothing ever falls', () => {
    const rising = Array.from({ length: 30 }, (_, i) => 100 + i);
    assert.equal(relativeStrengthIndex(rising, 14), 100);
});

test('relativeStrengthIndex returns null without enough history', () => {
    assert.equal(relativeStrengthIndex([1, 2, 3], 14), null);
});

test('macd histogram is positive while a series accelerates upward', () => {
    const accelerating = Array.from({ length: 120 }, (_, i) => 100 + i ** 1.4 / 10);
    const result = macd(accelerating);
    assert.ok(result.macd > 0);
    assert.ok(result.histogram > 0);
    assert.equal(result.histogram, result.macd - result.signal);
});

test('macd returns null without enough history', () => {
    assert.equal(macd([1, 2, 3, 4, 5]), null);
});

test('annualisedVolatility is zero for a flat series and rises with noise', () => {
    const flat = Array(60).fill(100);
    assert.equal(annualisedVolatility(flat), 0);

    const choppy = Array.from({ length: 60 }, (_, i) => 100 + (i % 2 === 0 ? 5 : -5));
    assert.ok(annualisedVolatility(choppy) > annualisedVolatility(flat));
});

test('maxDrawdown measures the deepest peak-to-trough decline', () => {
    // Peak 100 down to 50 is a 50% drawdown, and the later recovery must not erase it.
    assert.equal(maxDrawdown([100, 80, 50, 70, 120]), 50);
    assert.equal(maxDrawdown([100, 101, 102]), 0);
});

test('percentChange handles direction and guards divide-by-zero', () => {
    assert.equal(percentChange(100, 110), 10);
    assert.equal(percentChange(100, 90), -10);
    assert.equal(percentChange(0, 90), null);
});

test('rangePosition locates the last close inside its own range', () => {
    assert.equal(rangePosition([10, 20, 30]), 100);
    assert.equal(rangePosition([30, 20, 10]), 0);
    assert.equal(rangePosition([10, 30, 20]), 50);
});

// --- Scoring engine -------------------------------------------------------

function candlesFrom(closes) {
    return closes.map((close, i) => ({ date: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`, close }));
}

const UPTREND = Array.from({ length: 260 }, (_, i) => 100 * 1.002 ** i);
const DOWNTREND = Array.from({ length: 260 }, (_, i) => 300 * 0.998 ** i);

test('a sustained uptrend scores above neutral, a downtrend below', () => {
    const up = analyseTechnicals(candlesFrom(UPTREND));
    const down = analyseTechnicals(candlesFrom(DOWNTREND));

    assert.ok(up.score > 50, `uptrend scored ${up.score}`);
    assert.ok(down.score < 50, `downtrend scored ${down.score}`);
    assert.ok(up.score > down.score);
});

test('technical scores stay inside 0..100 for extreme inputs', () => {
    const spike = candlesFrom([...Array(200).fill(10), ...Array.from({ length: 60 }, (_, i) => 10 + i * 50)]);
    const { score } = analyseTechnicals(spike);
    assert.ok(score >= 0 && score <= 100, `score out of range: ${score}`);
});

test('every technical signal carries a weight so the score is a real number', () => {
    const { score, signals } = analyseTechnicals(candlesFrom(UPTREND));
    assert.ok(Number.isFinite(score));
    for (const item of signals) assert.ok(Number.isFinite(item.weight), `${item.label} has no weight`);
});

test('short history still scores using the signals it can compute', () => {
    // 60 candles: MA50 and RSI are available, MA200 is not.
    const { score, signals } = analyseTechnicals(candlesFrom(UPTREND.slice(0, 60)));
    assert.ok(Number.isFinite(score));
    assert.equal(signals.find((s) => s.label === 'מגמה מול ממוצע 200').impact, null);
});

test('healthy fundamentals outscore distressed ones', () => {
    const healthy = analyseFundamentals({
        trailingPE: 18,
        pegRatio: 0.9,
        revenueGrowth: 22,
        earningsGrowth: 30,
        profitMargin: 25,
        returnOnEquity: 28,
        debtToEquity: 40,
        currentRatio: 2.1,
        dividendYield: 1.5,
        priceToBook: 4
    });
    const distressed = analyseFundamentals({
        trailingPE: -12,
        pegRatio: null,
        revenueGrowth: -15,
        earningsGrowth: -40,
        profitMargin: -8,
        returnOnEquity: -20,
        debtToEquity: 320,
        currentRatio: 0.6,
        dividendYield: 0,
        priceToBook: 12
    });

    assert.ok(healthy.score > 65, `healthy scored ${healthy.score}`);
    assert.ok(distressed.score < 35, `distressed scored ${distressed.score}`);
});

test('analyseFundamentals returns null when there is nothing to analyse', () => {
    assert.equal(analyseFundamentals(null), null);
});

test('fundamentals of entirely unknown values produce no score', () => {
    const empty = analyseFundamentals({
        trailingPE: null,
        forwardPE: null,
        pegRatio: null,
        revenueGrowth: null,
        earningsGrowth: null,
        profitMargin: null,
        returnOnEquity: null,
        debtToEquity: null,
        currentRatio: null,
        dividendYield: null,
        priceToBook: null
    });
    assert.equal(empty.score, null);
});

test('combineScores weights fundamentals more heavily and falls back cleanly', () => {
    assert.equal(combineScores(100, 0).score, 40); // 100*0.4 + 0*0.6
    assert.equal(combineScores(80, null).score, 80);
    assert.equal(combineScores(null, 80).score, 80);
    assert.equal(combineScores(null, null), null);
});

test('combineScores maps every band to a verdict', () => {
    assert.equal(combineScores(90, 90).verdict, 'קנייה חזקה');
    assert.equal(combineScores(65, 65).verdict, 'קנייה');
    assert.equal(combineScores(50, 50).verdict, 'החזקה');
    assert.equal(combineScores(35, 35).verdict, 'מכירה');
    assert.equal(combineScores(10, 10).verdict, 'מכירה חזקה');
});

test('fallbackNarration produces Hebrew prose without an API key', () => {
    const technical = analyseTechnicals(candlesFrom(UPTREND));
    const overall = combineScores(technical.score, null);
    const text = fallbackNarration({ name: 'Test Corp', symbol: 'TEST', overall, technical, fundamental: null });

    assert.ok(text.includes('TEST'));
    assert.ok(text.includes(overall.verdict));
    assert.ok(text.includes('אינה המלצת השקעה'));
});
