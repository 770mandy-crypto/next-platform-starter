'use client';

import { useState } from 'react';
import Link from 'next/link';

export function PortfolioManager({ initialHoldings }) {
    const [holdings, setHoldings] = useState(initialHoldings);
    const [symbol, setSymbol] = useState('');
    const [shares, setShares] = useState('');
    const [avgPrice, setAvgPrice] = useState('');
    const [note, setNote] = useState('');
    const [state, setState] = useState({ status: 'idle' });

    async function onAdd(event) {
        event.preventDefault();
        setState({ status: 'loading' });

        const response = await fetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, shares, avgPrice, note })
        });
        const payload = await response.json();

        if (!response.ok) {
            setState({ status: 'error', error: payload.error });
            return;
        }

        setHoldings(payload.holdings);
        setSymbol('');
        setShares('');
        setAvgPrice('');
        setNote('');
        setState({ status: 'idle' });
    }

    async function onRemove(targetSymbol) {
        setState({ status: 'loading' });
        const response = await fetch(`/api/portfolio?symbol=${encodeURIComponent(targetSymbol)}`, {
            method: 'DELETE'
        });
        const payload = await response.json();
        if (response.ok) setHoldings(payload.holdings);
        setState({ status: 'idle' });
    }

    return (
        <div className="flex flex-col gap-6">
            <form onSubmit={onAdd} className="flex flex-col gap-4 p-6 rounded-lg bg-white/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <input
                        value={symbol}
                        onChange={(event) => setSymbol(event.target.value)}
                        placeholder="סימבול, למשל AAPL"
                        required
                        dir="ltr"
                        className="flex-1 min-w-[10rem] px-4 py-3 text-white rounded bg-white/10 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                        value={shares}
                        onChange={(event) => setShares(event.target.value)}
                        placeholder="כמות מניות (רשות)"
                        type="number"
                        min="0"
                        step="any"
                        dir="ltr"
                        className="w-48 px-4 py-3 text-white rounded bg-white/10 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                        value={avgPrice}
                        onChange={(event) => setAvgPrice(event.target.value)}
                        placeholder="מחיר קנייה ממוצע (רשות)"
                        type="number"
                        min="0"
                        step="any"
                        dir="ltr"
                        className="w-56 px-4 py-3 text-white rounded bg-white/10 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="הערה אישית (רשות)"
                    className="px-4 py-3 text-white rounded bg-white/10 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {state.status === 'error' && (
                    <div className="p-3 text-sm rounded bg-red-500/15 border border-red-400/40">{state.error}</div>
                )}

                <button
                    type="submit"
                    disabled={state.status === 'loading'}
                    className="self-start px-6 py-3 font-bold rounded bg-primary text-primary-content disabled:opacity-50"
                >
                    הוסף לרשימה
                </button>
            </form>

            {holdings.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-white/5 opacity-70">
                    הרשימה שלך ריקה. הוסף מניה למעלה, או{' '}
                    <Link href="/bot" className="text-primary">
                        נתח מניה
                    </Link>{' '}
                    ולחץ &quot;הוסף לרשימה שלי&quot; בדוח.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg bg-white/5">
                    <table className="w-full text-sm border-collapse min-w-[520px]">
                        <thead>
                            <tr className="text-right border-b border-white/20">
                                <th className="px-4 py-3 font-semibold">נייר</th>
                                <th className="px-4 py-3 font-semibold">כמות</th>
                                <th className="px-4 py-3 font-semibold">מחיר קנייה ממוצע</th>
                                <th className="px-4 py-3 font-semibold">הערה</th>
                                <th className="px-4 py-3 font-semibold"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {holdings.map((holding) => (
                                <tr key={holding.symbol} className="border-b border-white/10 last:border-0">
                                    <td className="px-4 py-3">
                                        <Link href={`/bot?symbol=${holding.symbol}`} className="font-semibold text-primary" dir="ltr">
                                            {holding.symbol}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 tabular-nums" dir="ltr">
                                        {holding.shares ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums" dir="ltr">
                                        {holding.avgPrice ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">{holding.note || '—'}</td>
                                    <td className="px-4 py-3 text-left">
                                        <button
                                            type="button"
                                            onClick={() => onRemove(holding.symbol)}
                                            className="text-sm opacity-70 hover:opacity-100"
                                        >
                                            הסר
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {holdings.length > 0 && (
                <a
                    href="/api/portfolio/export"
                    className="self-start px-5 py-3 font-bold rounded bg-white/10 hover:bg-white/20"
                >
                    ⬇️ הורדת הרשימה כקובץ CSV
                </a>
            )}
        </div>
    );
}
