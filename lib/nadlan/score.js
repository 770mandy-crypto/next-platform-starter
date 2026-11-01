// Growth score for a neighborhood: 0–100, built from separate parts so the
// site and the agent can always explain where a score comes from. It describes
// signals that have historically come before price growth; it is not a price
// forecast.

import { areas, cities } from './areas.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
// Maps value from [from, to] onto [0, points], clamped.
const scale = (value, from, to, points) => clamp((value - from) / (to - from), 0, 1) * points;

export const WEIGHTS = {
    momentum: 30, // price change over the last 12 months, -2% → 0, 10% → 30
    gap: 20, // how much cheaper than the city average, 0% → 0, 30% → 20
    yield: 15, // rent yield, 2.5% → 0, 4.5% → 15
    signals: 25, // 8 points per growth driver, up to 25
    liquidity: 10, // sales in the last 12 months, 50 → 0, 250 → 10
    riskPenalty: 4 // points off per listed risk
};

export function cityAveragePrice(cityId, list = areas) {
    const inCity = list.filter((a) => a.city === cityId);
    if (!inCity.length) return null;
    return inCity.reduce((sum, a) => sum + a.pricePerSqm, 0) / inCity.length;
}

export function scoreArea(area, list = areas) {
    const cityAvg = cityAveragePrice(area.city, list) ?? area.pricePerSqm;
    const gapPercent = ((cityAvg - area.pricePerSqm) / cityAvg) * 100;
    const parts = {
        momentum: scale(area.change12m, -2, 10, WEIGHTS.momentum),
        gap: scale(gapPercent, 0, 30, WEIGHTS.gap),
        yield: scale(area.rentYield, 2.5, 4.5, WEIGHTS.yield),
        signals: Math.min(WEIGHTS.signals, area.signals.length * 8),
        liquidity: scale(area.transactions12m, 50, 250, WEIGHTS.liquidity),
        risks: -area.risks.length * WEIGHTS.riskPenalty
    };
    const total = Math.round(clamp(Object.values(parts).reduce((s, v) => s + v, 0), 0, 100));
    return {
        score: total,
        trend: trendLabel(total),
        gapPercent: Math.round(gapPercent),
        parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v)]))
    };
}

export function trendLabel(score) {
    if (score >= 70) return { id: 'strong', label: 'מגמת עלייה חזקה', color: '#059669' };
    if (score >= 55) return { id: 'up', label: 'מגמת עלייה', color: '#65a30d' };
    if (score >= 40) return { id: 'stable', label: 'יציב', color: '#d97706' };
    return { id: 'weak', label: 'צמיחה איטית', color: '#dc2626' };
}

const cityById = Object.fromEntries(cities.map((c) => [c.id, c]));

// Every area with its city name and score, highest score first.
export function rankedAreas(list = areas) {
    return list
        .map((area) => ({ ...area, cityName: cityById[area.city]?.name ?? area.city, ...scoreArea(area, list) }))
        .sort((a, b) => b.score - a.score);
}

export function findArea(id) {
    return rankedAreas().find((a) => a.id === id) ?? null;
}

// Filters for the agent and the site. budget is the total price the buyer can
// pay, sqm the apartment size they want (default 90 m²). goal 'investment'
// ranks by score with rent yield as a tie-breaker; 'living' prefers areas with
// fewer risks.
export function searchAreas({ budget, sqm = 90, city, goal = 'any', limit = 5 } = {}) {
    let list = rankedAreas();
    if (city) {
        const wanted = city.trim();
        list = list.filter((a) => a.city === wanted || a.cityName.includes(wanted) || wanted.includes(a.cityName));
    }
    if (budget) list = list.filter((a) => a.pricePerSqm * sqm <= budget);
    if (goal === 'investment') list = [...list].sort((a, b) => b.score - a.score || b.rentYield - a.rentYield);
    if (goal === 'living') list = [...list].sort((a, b) => a.risks.length - b.risks.length || b.score - a.score);
    return list.slice(0, clamp(limit, 1, 15)).map((a) => ({ ...a, estimatedPrice: Math.round(a.pricePerSqm * sqm) }));
}
