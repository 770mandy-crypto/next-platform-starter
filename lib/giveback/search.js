// Free-text matching and distance ranking for the item search.

import { categoryById } from './catalog.js';
import { distanceKm } from './geo.js';

const NIQQUD = /[֑-ׇ]/g;
const FINAL_LETTERS = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

// Hebrew-aware normalisation: drop vowel points and punctuation, and fold
// final letters into their regular form so "ספרים" still matches "ספר".
export function normalize(text) {
    return String(text ?? '')
        .toLowerCase()
        .replace(NIQQUD, '')
        .replace(/[ךםןףץ]/g, (ch) => FINAL_LETTERS[ch])
        .replace(/["'״׳`]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

// Hebrew glues the article and common prepositions onto the word ("השידה",
// "לילדים"). A search for "השידה" should find "שידה", so each query token also
// tries itself without one leading prefix letter.
const PREFIXES = new Set(['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ']);

function tokenVariants(token) {
    const variants = [token];
    if (token.length > 3 && PREFIXES.has(token[0])) variants.push(token.slice(1));
    return variants;
}

export function matchesQuery(item, query) {
    const tokens = normalize(query).split(' ').filter(Boolean);
    if (tokens.length === 0) return true;
    const haystack = normalize([item.title, item.description, categoryById(item.category).label, item.area].join(' '));
    return tokens.every((token) => tokenVariants(token).some((v) => haystack.includes(v)));
}

// Filters to what is still available and matches, then sorts nearest-first
// when we know where the searcher is, newest-first otherwise.
export function rankItems(items, { origin = null, query = '', category = '', radiusKm = null } = {}) {
    const ranked = [];
    for (const item of items) {
        if (item.status === 'given') continue;
        if (category && item.category !== category) continue;
        if (!matchesQuery(item, query)) continue;
        const km = origin ? distanceKm(origin, item.location) : null;
        if (radiusKm && km != null && km > radiusKm) continue;
        ranked.push({ item, distanceKm: km });
    }
    ranked.sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) {
            return a.distanceKm - b.distanceKm;
        }
        return b.item.createdAt - a.item.createdAt;
    });
    return ranked;
}
