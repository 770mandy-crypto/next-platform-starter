'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { UNIVERSES, batchSymbols } from 'lib/universe';

const TONE_COLORS = {
    'strong-buy': '#22c55e',
    buy: '#84cc16',
    hold: '#eab308',
    sell: '#f97316',
    'strong-sell': '#ef4444'
};

function pct(value, digits = 1) {
    if (!Number.isFinite(value)) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function Scanner() {
    const [universeKey, setUniverseKey] = useState('mega');
    const [rows, setRows] = useState([]);
    const [failures, setFailures] = useState([]);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [status, setStatus] = useState('idle');
    const [minScore, setMinScore] = useState(0);
    // A ref rather than state: the running scan must see cancellation
    // immediately, without waiting for a re-render.
    const cancelled = useRef(false);

    async function runScan() {
        const universe = UNIVERSES[universeKey];
        const batches = batchSymbols(universe.symbols);

        cancelled.current = false;
        setStatus('running');
        setRows([]);
        setFailures([]);
        setProgress({ done: 0, total: universe.symbols.length });

        const collected = [];
        const failed = [];

        for (const batch of batches) {
            if (cancelled.current) break;
            try {
                const response = await fetch(`/api/scan?symbols=${encodeURIComponent(batch.join(','))}`);
                const payload = await response.json();
                if (response.ok) {
                    for (const row of payload.results) {
                        if (row.ok) collected.push(row);
                        else failed.push(row);
                    }
                } else {
                    batch.forEach((symbol) => failed.push({ symbol, error: payload.error || 'נכשל' }));
                }
            } catch {
                batch.forEach((symbol) => failed.push({ symbol, error: 'שגיאת רשת' }));
            }

            // Publish after every batch so results appear as they arrive.
            collected.sort((a, b) => b.score - a.score);
            setRows([...collected]);
            setFailures([...failed]);
            setProgress((current) => ({ ...current, done: Math.min(current.done + batch.length, current.total) }));
        }

        setStatus(cancelled.current ? 'cancelled' : 'done');
    }

    const visible = rows.filter((row) => row.score >= minScore);
    const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4 p-6 rounded-lg bg-white/5">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(UNIVERSES).map(([key, universe]) => (
                        <button
                            key={key}
                            type="button"
                            disabled={status === 'running'}
                            onClick={() => setUniverseKey(key)}
                            className={`px-4 py-2 text-sm rounded transition disabled:opacity-50 ${
                                universeKey === key ? 'bg-primary text-primary-content font-bold' : 'bg-white/10'
                            }`}
                        >
                            {universe.label}
                        </button>
                    ))}
                </div>
                <p className="text-sm opacity-70">{UNIVERSES[universeKey].description}</p>

                <div className="flex flex-wrap items-center gap-3">
                    {status !== 'running' ? (
                        <button
                            type="button"
                            onClick={runScan}
                            className="px-6 py-3 font-bold rounded bg-primary text-primary-content"
                        >
                            סרוק {UNIVERSES[universeKey].symbols.length} מניות
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                cancelled.current = true;
                            }}
                            className="px-6 py-3 font-bold rounded bg-red-500/80"
                        >
                            עצור
                        </button>
                    )}

                    {rows.length > 0 && (
                        <label className="flex items-center gap-2 text-sm">
                            ציון מינימלי:
                            <input
                                type="range"
                                min="0"
                                max="80"
                                step="5"
                                value={minScore}
                                onChange={(event) => setMinScore(Number(event.target.value))}
                            />
                            <span className="tabular-nums w-7">{minScore}</span>
                        </label>
                    )}
                </div>

                {progress.total > 0 && (
                    <div>
                        <div className="w-full h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full transition-all duration-300 bg-primary" style={{ width: `${percent}%` }} />
                        </div>
                        <p className="mt-1 text-xs opacity-60">
                            {progress.done} מתוך {progress.total} · {rows.length} נותחו בהצלחה
                            {failures.length > 0 && ` · ${failures.length} נכשלו`}
                            {status === 'running' && ' · סורק…'}
                            {status === 'cancelled' && ' · הופסק'}
                        </p>
                    </div>
                )}
            </section>

            {visible.length > 0 && (
                <div className="overflow-x-auto rounded-lg bg-white/5">
                    <table className="w-full text-sm border-collapse min-w-[720px]">
                        <thead>
                            <tr className="text-right border-b border-white/20">
                                <th className="px-4 py-3 font-semibold">#</th>
                                <th className="px-4 py-3 font-semibold">נייר</th>
                                <th className="px-4 py-3 font-semibold">מחיר</th>
                                <th className="px-4 py-3 font-semibold">חודש</th>
                                <th className="px-4 py-3 font-semibold">3 חודשים</th>
                                <th className="px-4 py-3 font-semibold">שנה</th>
                                <th className="px-4 py-3 font-semibold">RSI</th>
                                <th className="px-4 py-3 font-semibold">מגמה</th>
                                <th className="px-4 py-3 font-semibold">ציון</th>
                                <th className="px-4 py-3 font-semibold">המלצה</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((row, index) => (
                                <tr key={row.symbol} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                                    <td className="px-4 py-2 tabular-nums opacity-60">{index + 1}</td>
                                    <td className="px-4 py-2 font-semibold" dir="ltr" align="right">
                                        <Link href={`/bot?symbol=${row.symbol}`} className="text-primary">
                                            {row.symbol}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2 tabular-nums" dir="ltr" align="right">
                                        {row.price?.toFixed(2)}
                                    </td>
                                    {['oneMonth', 'threeMonths', 'oneYear'].map((key) => (
                                        <td
                                            key={key}
                                            dir="ltr"
                                            align="right"
                                            className={`px-4 py-2 tabular-nums ${
                                                row.returns?.[key] >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}
                                        >
                                            {pct(row.returns?.[key])}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 tabular-nums" dir="ltr" align="right">
                                        {row.rsi?.toFixed(0) ?? '—'}
                                    </td>
                                    <td className="px-4 py-2 text-xs">
                                        {row.aboveMa200 ? '📈 מעל 200' : '📉 מתחת 200'}
                                    </td>
                                    <td className="px-4 py-2 font-bold tabular-nums">{row.score}</td>
                                    <td className="px-4 py-2">
                                        <span
                                            className="px-2 py-1 text-xs font-bold rounded"
                                            style={{ backgroundColor: TONE_COLORS[row.tone], color: '#0b1b3a' }}
                                        >
                                            {row.verdict}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {rows.length > 0 && visible.length === 0 && (
                <div className="p-6 text-center rounded-lg bg-white/5">
                    אף מניה לא עברה את סף הציון {minScore}. הורד את הסף כדי לראות תוצאות.
                </div>
            )}

            {failures.length > 0 && (
                <div className="p-4 text-sm rounded-lg bg-yellow-500/15 border border-yellow-400/40">
                    לא נותחו: {failures.map((failure) => failure.symbol).join(', ')}
                </div>
            )}

            <p className="text-xs leading-relaxed opacity-50">
                הסריקה טכנית בלבד ומבוססת על מחירים — ספק הנתונים הזמין אינו מספק נתונים פונדמנטליים. אין לראות בה
                ייעוץ השקעות או תחליף לייעוץ אישי.
            </p>
        </div>
    );
}
