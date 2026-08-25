// Pure technical-indicator math. Every function takes a chronological array of
// closing prices (oldest first) and returns null when there isn't enough history.

export function simpleMovingAverage(values, period) {
    if (!Array.isArray(values) || values.length < period || period <= 0) return null;
    const window = values.slice(-period);
    return window.reduce((sum, value) => sum + value, 0) / period;
}

// Exponential moving average over the whole series, seeded with the SMA of the
// first `period` values. Returns the full EMA series so MACD can subtract them.
export function exponentialMovingAverageSeries(values, period) {
    if (!Array.isArray(values) || values.length < period || period <= 0) return null;

    const multiplier = 2 / (period + 1);
    const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

    const series = [seed];
    for (let i = period; i < values.length; i++) {
        series.push((values[i] - series[series.length - 1]) * multiplier + series[series.length - 1]);
    }
    return series;
}

// Wilder's RSI: the first average is a plain mean of the initial `period` moves,
// after which gains and losses are smoothed rather than re-averaged.
export function relativeStrengthIndex(values, period = 14) {
    if (!Array.isArray(values) || values.length < period + 1) return null;

    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const change = values[i] - values[i - 1];
        if (change >= 0) avgGain += change;
        else avgLoss -= change;
    }
    avgGain /= period;
    avgLoss /= period;

    for (let i = period + 1; i < values.length; i++) {
        const change = values[i] - values[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? -change : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

export function macd(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fast = exponentialMovingAverageSeries(values, fastPeriod);
    const slow = exponentialMovingAverageSeries(values, slowPeriod);
    if (!fast || !slow) return null;

    // The fast EMA starts earlier in calendar time, so trim its head to align.
    const offset = fast.length - slow.length;
    const macdLine = slow.map((slowValue, i) => fast[i + offset] - slowValue);

    const signalSeries = exponentialMovingAverageSeries(macdLine, signalPeriod);
    if (!signalSeries) return null;

    const macdValue = macdLine[macdLine.length - 1];
    const signal = signalSeries[signalSeries.length - 1];
    return { macd: macdValue, signal, histogram: macdValue - signal };
}

// Annualised standard deviation of daily log returns, as a percentage.
export function annualisedVolatility(values, tradingDaysPerYear = 252) {
    if (!Array.isArray(values) || values.length < 3) return null;

    const returns = [];
    for (let i = 1; i < values.length; i++) {
        if (values[i - 1] > 0 && values[i] > 0) returns.push(Math.log(values[i] / values[i - 1]));
    }
    if (returns.length < 2) return null;

    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(tradingDaysPerYear) * 100;
}

// Deepest peak-to-trough decline in the series, as a positive percentage.
export function maxDrawdown(values) {
    if (!Array.isArray(values) || values.length < 2) return null;

    let peak = values[0];
    let worst = 0;
    for (const value of values) {
        if (value > peak) peak = value;
        if (peak > 0) {
            const drawdown = (peak - value) / peak;
            if (drawdown > worst) worst = drawdown;
        }
    }
    return worst * 100;
}

export function percentChange(from, to) {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
    return ((to - from) / from) * 100;
}

// Where the latest price sits inside its own high/low range, 0 (low) to 100 (high).
export function rangePosition(values) {
    if (!Array.isArray(values) || values.length < 2) return null;
    const high = Math.max(...values);
    const low = Math.min(...values);
    if (high === low) return 50;
    return ((values[values.length - 1] - low) / (high - low)) * 100;
}
