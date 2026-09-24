'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, CITIES } from 'lib/giveback/catalog';
import { api } from './api';
import { ItemCard } from './item-card';
import { useOrigin } from './location';

const RADII = [
    { km: 2, label: '2 ק״מ' },
    { km: 5, label: '5 ק״מ' },
    { km: 15, label: '15 ק״מ' },
    { km: 0, label: 'בכל הארץ' }
];

export function Search() {
    const { origin, locate, chooseCity, locating, error: locError } = useOrigin();
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [category, setCategory] = useState('');
    const [radius, setRadius] = useState(15);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebounced(query), 300);
        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (debounced) params.set('q', debounced);
        if (category) params.set('category', category);
        if (origin) {
            params.set('lat', origin.lat);
            params.set('lng', origin.lng);
            if (radius) params.set('radius', radius);
        }
        let cancelled = false;
        api(`/items?${params}`)
            .then((r) => !cancelled && (setResult(r), setError('')))
            .catch((e) => !cancelled && setError(e.message));
        return () => {
            cancelled = true;
        };
    }, [debounced, category, origin, radius]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 p-4 border rounded-xl border-white/10 bg-white/5">
                <input
                    type="search"
                    className="input text-base"
                    placeholder="מה מחפשים? שידה, עגלה, ספרי ילדים…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="חיפוש"
                />

                <div className="flex flex-wrap gap-2" role="group" aria-label="קטגוריה">
                    <Chip active={!category} onClick={() => setCategory('')}>
                        הכל
                    </Chip>
                    {CATEGORIES.map((c) => (
                        <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                            {c.emoji} {c.label}
                        </Chip>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <button
                        type="button"
                        className="btn"
                        style={{ '--btn-py': '0.5rem' }}
                        onClick={locate}
                        disabled={locating}
                    >
                        {locating ? 'מאתר…' : '📍 לפי המיקום שלי'}
                    </button>
                    <span className="opacity-60">או</span>
                    <select
                        className="input py-2"
                        value={origin?.source === 'city' ? origin.label : ''}
                        onChange={(e) => chooseCity(e.target.value)}
                        aria-label="עיר"
                    >
                        <option value="">בחירת עיר…</option>
                        {CITIES.map((c) => (
                            <option key={c.name}>{c.name}</option>
                        ))}
                    </select>
                    {origin && (
                        <select
                            className="input py-2"
                            value={radius}
                            onChange={(e) => setRadius(Number(e.target.value))}
                            aria-label="מרחק"
                        >
                            {RADII.map((r) => (
                                <option key={r.km} value={r.km}>
                                    עד {r.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                {origin && <p className="text-xs opacity-70">ממוין מהקרוב לרחוק אל: {origin.label}</p>}
                {locError && <p className="text-xs text-red-300">{locError} — אפשר לבחור עיר במקום.</p>}
            </div>

            {error && <p className="text-red-300">{error}</p>}
            {!result && !error && <p className="opacity-70">טוען…</p>}
            {result && result.items.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <p className="text-lg">לא מצאנו כרגע משהו מתאים{origin && radius ? ` עד ${radius} ק״מ` : ''}.</p>
                    <p className="opacity-70">נסו להרחיב את המרחק, או היו הראשונים לפרסם בשכונה.</p>
                    <Link href="/giveback/new" className="btn">
                        ➕ יש לי משהו למסור
                    </Link>
                </div>
            )}
            {result && result.items.length > 0 && (
                <>
                    <p className="text-sm opacity-70">{result.total} פריטים זמינים</p>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {result.items.map((item) => (
                            <ItemCard key={item.id} item={item} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function Chip({ active, children, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`px-3 py-1.5 text-sm rounded-full border transition cursor-pointer ${
                active
                    ? 'bg-primary text-primary-content border-primary font-bold'
                    : 'border-white/20 hover:bg-white/10'
            }`}
        >
            {children}
        </button>
    );
}
