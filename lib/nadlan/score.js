// Growth score for a neighborhood: 0–100, built from separate parts so the
// site and the agent can always explain where a score comes from. It describes
// signals that have historically come before price growth; it is not a price
// forecast.
//
// Each part is used only when its data exists, and the score is normalized by
// the points that were available, so a neighborhood without rent data is not
// punished for it (but `coverage` says how much of the model was used).
//
// An area: { id, city, cityName, name, price, change12m, change36m, rentYield,
//            signals: [{kind, text}], risks: [string], ... }
// price is the median price of a whole apartment, ₪.

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
// Maps value from [from, to] onto [0, points], clamped.
const scale = (value, from, to, points) => clamp((value - from) / (to - from), 0, 1) * points;
const known = (v) => typeof v === 'number' && Number.isFinite(v);

export const WEIGHTS = {
    momentum: 30, // last 12 months, -2% → 0, 10% → 30
    longTerm: 10, // last 3 years, 0% → 0, 30% → 10
    gap: 20, // cheaper than the city median, 0% → 0, 30% → 20
    yield: 15, // rent yield, 2.5% → 0, 4.5% → 15
    signals: 25, // 8 points per growth driver, up to 25
    riskPenalty: 4 // points off per risk
};

export function cityMedian(cityId, list) {
    const prices = list.filter((a) => a.city === cityId && known(a.price)).map((a) => a.price).sort((a, b) => a - b);
    if (!prices.length) return null;
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
}

// Risks read from the numbers themselves, added to any curated ones.
export function dataRisks(area, gapPercent) {
    const risks = [];
    if (known(area.change12m) && area.change12m < 0) risks.push(`המחירים ירדו ב-${Math.abs(area.change12m).toFixed(1)}% בשנה האחרונה`);
    if (known(gapPercent) && gapPercent < -25) risks.push('יקרה בהרבה מהממוצע בעיר');
    if (known(area.rentYield) && area.rentYield < 2.3) risks.push('תשואה נמוכה משכירות');
    return risks;
}

export function scoreArea(area, list) {
    const median = area.cityMedian ?? cityMedian(area.city, list);
    const gapPercent = known(median) && known(area.price) && median > 0 ? ((median - area.price) / median) * 100 : null;
    const risks = [...new Set([...(area.risks ?? []), ...dataRisks(area, gapPercent)])];
    const signals = area.signals ?? [];

    const parts = {};
    let available = 0;
    const add = (key, value, max) => {
        if (value === null) return;
        parts[key] = value;
        available += max;
    };
    add('momentum', known(area.change12m) ? scale(area.change12m, -2, 10, WEIGHTS.momentum) : null, WEIGHTS.momentum);
    add('longTerm', known(area.change36m) ? scale(area.change36m, 0, 30, WEIGHTS.longTerm) : null, WEIGHTS.longTerm);
    add('gap', known(gapPercent) ? scale(gapPercent, 0, 30, WEIGHTS.gap) : null, WEIGHTS.gap);
    add('yield', known(area.rentYield) ? scale(area.rentYield, 2.5, 4.5, WEIGHTS.yield) : null, WEIGHTS.yield);
    // Growth drivers count only where they were collected for this area.
    add('signals', area.signalsCollected === false ? null : Math.min(WEIGHTS.signals, signals.length * 8), WEIGHTS.signals);

    const earned = Object.values(parts).reduce((s, v) => s + v, 0);
    const penalty = risks.length * WEIGHTS.riskPenalty;
    const score = available ? Math.round(clamp((earned / available) * 100 - penalty, 0, 100)) : 0;
    const max = Object.values(WEIGHTS).reduce((s, v) => s + v, 0) - WEIGHTS.riskPenalty;

    return {
        score,
        trend: trendLabel(score),
        gapPercent: known(gapPercent) ? Math.round(gapPercent) : null,
        risks,
        coverage: Math.round((available / max) * 100),
        parts: { ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v)])), risks: -penalty }
    };
}

export function trendLabel(score) {
    if (score >= 70) return { id: 'strong', label: 'מגמת עלייה חזקה', color: '#059669' };
    if (score >= 55) return { id: 'up', label: 'מגמת עלייה', color: '#65a30d' };
    if (score >= 40) return { id: 'stable', label: 'יציב', color: '#d97706' };
    return { id: 'weak', label: 'צמיחה איטית', color: '#dc2626' };
}

// Every area with its score, highest first.
export function rankAreas(list) {
    return list.map((area) => ({ ...area, ...scoreArea(area, list) })).sort((a, b) => b.score - a.score);
}

const matchesCity = (area, wanted) => area.city === wanted || area.cityName.includes(wanted) || wanted.includes(area.cityName);

// Filters for the agent and the site, over ranked areas. budget is the total
// the buyer can pay; rooms picks the matching median when the area has one.
// goal 'investment' prefers score then rent yield; 'living' prefers fewer risks.
export function searchAreas(ranked, { budget, rooms, city, goal = 'any', limit = 5 } = {}) {
    let list = ranked.map((a) => ({ ...a, estimatedPrice: priceFor(a, rooms) }));
    if (city?.trim()) list = list.filter((a) => matchesCity(a, city.trim()));
    if (budget) list = list.filter((a) => known(a.estimatedPrice) && a.estimatedPrice <= budget);
    if (goal === 'investment') list.sort((a, b) => b.score - a.score || (b.rentYield ?? 0) - (a.rentYield ?? 0));
    else if (goal === 'living') list.sort((a, b) => a.risks.length - b.risks.length || b.score - a.score);
    return list.slice(0, clamp(limit, 1, 15));
}

// Median price for a room count (3, 4, 5), falling back to the all-rooms median.
export function priceFor(area, rooms) {
    if (rooms && area.perRoom) {
        const keys = Object.keys(area.perRoom).map(Number).filter(Number.isFinite);
        if (keys.length) {
            const best = keys.reduce((a, b) => (Math.abs(b - rooms) < Math.abs(a - rooms) ? b : a));
            if (Math.abs(best - rooms) <= 1) return area.perRoom[best];
        }
    }
    return area.price ?? null;
}
