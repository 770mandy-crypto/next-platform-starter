'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'inventory-products-v1';

const CATEGORIES = ['מזון', 'משקאות', 'תרופות', 'קוסמטיקה', 'ניקיון', 'אחר'];

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function daysUntil(dateStr) {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - startOfToday().getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
}

function statusFor(days) {
    if (days < 0) return { key: 'expired', label: 'פג תוקף', classes: 'bg-red-100 text-red-800 border-red-300' };
    if (days === 0) return { key: 'today', label: 'פג היום', classes: 'bg-red-100 text-red-800 border-red-300' };
    if (days <= 7) return { key: 'soon', label: `בעוד ${days} ימים`, classes: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (days <= 30) return { key: 'watch', label: `בעוד ${days} ימים`, classes: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
    return { key: 'ok', label: `בעוד ${days} ימים`, classes: 'bg-green-100 text-green-800 border-green-300' };
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ProductTracker() {
    const [products, setProducts] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [name, setName] = useState('');
    const [expiry, setExpiry] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [filter, setFilter] = useState('all');

    // Load from localStorage once on mount.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setProducts(JSON.parse(raw));
        } catch {
            // ignore malformed storage
        }
        setLoaded(true);
    }, []);

    // Persist on every change (after the initial load).
    useEffect(() => {
        if (!loaded) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }, [products, loaded]);

    function addProduct(e) {
        e.preventDefault();
        if (!name.trim() || !expiry) return;
        const product = {
            id: crypto.randomUUID(),
            name: name.trim(),
            expiry,
            quantity: Math.max(1, parseInt(quantity, 10) || 1),
            category
        };
        setProducts((prev) => [...prev, product]);
        setName('');
        setExpiry('');
        setQuantity('1');
        setCategory(CATEGORIES[0]);
    }

    function removeProduct(id) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
    }

    const sorted = useMemo(
        () => [...products].sort((a, b) => new Date(a.expiry) - new Date(b.expiry)),
        [products]
    );

    const filtered = useMemo(() => {
        if (filter === 'all') return sorted;
        return sorted.filter((p) => {
            const s = statusFor(daysUntil(p.expiry)).key;
            if (filter === 'expired') return s === 'expired' || s === 'today';
            if (filter === 'soon') return s === 'soon';
            if (filter === 'ok') return s === 'ok' || s === 'watch';
            return true;
        });
    }, [sorted, filter]);

    const stats = useMemo(() => {
        let expired = 0;
        let soon = 0;
        for (const p of products) {
            const s = statusFor(daysUntil(p.expiry)).key;
            if (s === 'expired' || s === 'today') expired += 1;
            else if (s === 'soon') soon += 1;
        }
        return { total: products.length, expired, soon };
    }, [products]);

    const today = new Date().toISOString().split('T')[0];

    return (
        <div dir="rtl" className="flex flex-col gap-6 text-right">
            {/* Summary tiles */}
            <div className="grid grid-cols-3 gap-3">
                <SummaryTile label="סה״כ מוצרים" value={stats.total} classes="bg-white text-neutral-900" />
                <SummaryTile label="פג בקרוב (עד שבוע)" value={stats.soon} classes="bg-amber-100 text-amber-900" />
                <SummaryTile label="פג תוקף" value={stats.expired} classes="bg-red-100 text-red-900" />
            </div>

            {/* Add form */}
            <form onSubmit={addProduct} className="grid gap-3 p-5 bg-white rounded-sm sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-neutral-700 sm:col-span-2">
                    שם המוצר
                    <input
                        className="input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="לדוגמה: חלב 3%"
                        required
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm text-neutral-700">
                    תאריך תפוגה
                    <input
                        className="input"
                        type="date"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm text-neutral-700">
                    כמות
                    <input
                        className="input"
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm text-neutral-700">
                    קטגוריה
                    <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="flex items-end sm:justify-start">
                    <button type="submit" className="btn w-full sm:w-auto">
                        הוספת מוצר
                    </button>
                </div>
            </form>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: 'all', label: 'הכול' },
                    { key: 'expired', label: 'פג תוקף' },
                    { key: 'soon', label: 'פג בקרוב' },
                    { key: 'ok', label: 'בתוקף' }
                ].map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={[
                            'px-3 py-1.5 text-sm rounded-full border transition-colors',
                            filter === f.key
                                ? 'bg-primary text-primary-content border-primary'
                                : 'bg-transparent text-white border-white/30 hover:border-white'
                        ].join(' ')}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {!loaded ? null : filtered.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-sm text-neutral-500">
                    אין מוצרים להצגה. הוסיפו מוצר כדי להתחיל.
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {filtered.map((p) => {
                        const days = daysUntil(p.expiry);
                        const status = statusFor(days);
                        return (
                            <li
                                key={p.id}
                                className="flex items-center gap-4 px-5 py-4 bg-white rounded-sm text-neutral-800"
                            >
                                <div className="flex flex-col grow">
                                    <span className="font-bold text-neutral-900">
                                        {p.name}
                                        <span className="mr-2 text-sm font-normal text-neutral-500">×{p.quantity}</span>
                                    </span>
                                    <span className="text-sm text-neutral-500">
                                        {p.category} · תפוגה: {formatDate(p.expiry)}
                                    </span>
                                </div>
                                <span className={`shrink-0 px-3 py-1 text-sm font-medium border rounded-full ${status.classes}`}>
                                    {status.label}
                                </span>
                                <button
                                    onClick={() => removeProduct(p.id)}
                                    aria-label={`מחיקת ${p.name}`}
                                    className="shrink-0 px-2 py-1 text-neutral-400 hover:text-red-600 transition-colors"
                                >
                                    ✕
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function SummaryTile({ label, value, classes }) {
    return (
        <div className={`flex flex-col gap-1 px-4 py-4 rounded-sm ${classes}`}>
            <span className="text-3xl font-bold">{value}</span>
            <span className="text-xs opacity-80">{label}</span>
        </div>
    );
}
