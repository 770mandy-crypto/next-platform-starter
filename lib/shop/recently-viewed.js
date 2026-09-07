'use client';

import { useEffect, useState } from 'react';

const KEY = 'ayin.recent';
const MAX = 8;

function read() {
    try {
        const raw = window.localStorage.getItem(KEY);
        const value = raw ? JSON.parse(raw) : [];
        return Array.isArray(value) ? value.filter((slug) => typeof slug === 'string') : [];
    } catch {
        return [];
    }
}

/**
 * Records that a product page was opened and returns the previously seen slugs.
 *
 * The history never leaves the browser: it is only used to render a strip at
 * the bottom of the page, so localStorage is the whole store.
 */
export function useRecentlyViewed(currentSlug) {
    const [seen, setSeen] = useState([]);

    useEffect(() => {
        const previous = read();
        // Show what was viewed before this page, then record this page.
        setSeen(previous.filter((slug) => slug !== currentSlug));
        if (!currentSlug) return;
        const next = [currentSlug, ...previous.filter((slug) => slug !== currentSlug)].slice(0, MAX);
        try {
            window.localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            /* private mode or blocked storage — the strip simply stays empty */
        }
    }, [currentSlug]);

    return seen;
}
