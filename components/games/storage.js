'use client';

export function readHighScore(key) {
    if (typeof window === 'undefined') return 0;
    const raw = window.localStorage.getItem(key);
    const value = Number.parseInt(raw ?? '0', 10);
    return Number.isFinite(value) ? value : 0;
}

/** Stores the score when it beats the stored one. Returns true for a new record. */
export function saveHighScore(key, score) {
    if (typeof window === 'undefined') return false;
    if (score <= readHighScore(key)) return false;
    window.localStorage.setItem(key, String(score));
    return true;
}
