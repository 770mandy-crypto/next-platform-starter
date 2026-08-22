'use client';

import { useState } from 'react';
import { ReportView, formatValue } from './report-view';
import { ScoreGauge } from './score-gauge';

const EXAMPLES = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'GOOGL', 'TEVA.TA'];

export function Analyst() {
    const [input, setInput] = useState('');
    const [mode, setMode] = useState('single');
    const [state, setState] = useState({ status: 'idle' });

    async function run(rawInput, requestedMode) {
        const symbols = rawInput
            .split(/[\s,]+/)
            .map((part) => part.trim())
            .filter(Boolean);

        if (!symbols.length) {
            setState({ status: 'error', error: 'הזן סימבול אחד לפחות, למשל AAPL.' });
            return;
        }

        // Two symbols only make sense as a comparison, so switch for the user
        // rather than silently analysing just the first one.
        const effectiveMode = symbols.length > 1 ? 'compare' : requestedMode;
        if (effectiveMode === 'compare' && symbols.length < 2) {
            setState({ status: 'error', error: 'להשוואה צריך לפחות שני סימבולים.' });
            return;
        }

        setState({ status: 'loading', mode: effectiveMode });

        const url =
            effectiveMode === 'compare'
                ? `/api/compare?symbols=${encodeURIComponent(symbols.join(','))}`
                : `/api/analyze?symbol=${encodeURIComponent(symbols[0])}`;

        try {
            const response = await fetch(url);
            const payload = await response.json();
            if (!response.ok) {
                setState({ status: 'error', error: payload.error || 'הבקשה נכשלה.' });
                return;
            }
            setState({ status: 'done', mode: effectiveMode, payload });
        } catch {
            setState({ status: 'error', error: 'לא הצלחתי להגיע לשרת. בדוק את החיבור ונסה שוב.' });
        }
    }

    function onSubmit(event) {
        event.preventDefault();
        run(input, mode);
    }

    return (
        <div dir="rtl" className="flex flex-col gap-8">
            <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6 rounded-lg bg-white/5">
                <label htmlFor="symbols" className="font-semibold">
                    איזה נייר לבדוק?
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                        id="symbols"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="AAPL   או   AAPL, MSFT, NVDA להשוואה"
                        className="flex-1 px-4 py-3 text-white rounded bg-white/10 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                        autoComplete="off"
                        spellCheck="false"
                        dir="ltr"
                    />
                    <button
                        type="submit"
                        disabled={state.status === 'loading'}
                        className="px-6 py-3 font-bold rounded bg-primary text-primary-content disabled:opacity-50"
                    >
                        {state.status === 'loading' ? 'מנתח…' : 'נתח'}
                    </button>
                </div>

                <fieldset className="flex flex-wrap items-center gap-4 text-sm">
                    <legend className="sr-only">מצב ניתוח</legend>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="mode"
                            checked={mode === 'single'}
                            onChange={() => setMode('single')}
                        />
                        ניתוח מעמיק של נייר אחד
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="mode"
                            checked={mode === 'compare'}
                            onChange={() => setMode('compare')}
                        />
                        השוואה ודירוג בין ניירות
                    </label>
                </fieldset>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="opacity-60">נסה:</span>
                    {EXAMPLES.map((symbol) => (
                        <button
                            key={symbol}
                            type="button"
                            onClick={() => {
                                setInput(symbol);
                                run(symbol, 'single');
                            }}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            dir="ltr"
                        >
                            {symbol}
                        </button>
                    ))}
                </div>
            </form>

            {state.status === 'loading' && (
                <div className="p-6 text-center rounded-lg bg-white/5 animate-pulse">
                    🤖 שוקי אוסף נתונים ומחשב אינדיקטורים…
                </div>
            )}

            {state.status === 'error' && (
                <div className="p-6 rounded-lg bg-red-500/15 border border-red-400/40">{state.error}</div>
            )}

            {state.status === 'done' && state.mode === 'single' && <ReportView report={state.payload} />}
            {state.status === 'done' && state.mode === 'compare' && <ComparisonView payload={state.payload} />}
        </div>
    );
}

function ComparisonView({ payload }) {
    const [expanded, setExpanded] = useState(null);
    const winner = payload.ranking[0];

    return (
        <div className="flex flex-col gap-6">
            <section className="p-6 border rounded-lg border-primary/40 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl" aria-hidden="true">
                        🏆
                    </span>
                    <h3>המוביל בדירוג</h3>
                </div>
                <p className="leading-relaxed">
                    מבין {payload.ranking.length} הניירות שבדקתי, <strong>{winner.name}</strong> ({winner.symbol}) קיבל
                    את הציון הגבוה ביותר — {winner.overall?.score} מתוך 100, בדירוג &quot;{winner.overall?.verdict}
                    &quot;. הדירוג משקלל ניתוח פונדמנטלי (60%) וניתוח טכני (40%).
                </p>
            </section>

            <div className="overflow-x-auto rounded-lg bg-white/5">
                <table className="w-full text-sm border-collapse min-w-[640px]">
                    <thead>
                        <tr className="text-right border-b border-white/20">
                            <th className="px-4 py-3 font-semibold">#</th>
                            <th className="px-4 py-3 font-semibold">נייר</th>
                            <th className="px-4 py-3 font-semibold">מחיר</th>
                            <th className="px-4 py-3 font-semibold">שנה</th>
                            <th className="px-4 py-3 font-semibold">טכני</th>
                            <th className="px-4 py-3 font-semibold">פונדמנטלי</th>
                            <th className="px-4 py-3 font-semibold">ציון</th>
                            <th className="px-4 py-3 font-semibold">המלצה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payload.ranking.map((report) => {
                            const yearReturn = report.technical?.metrics?.returns?.oneYear;
                            const isOpen = expanded === report.symbol;
                            return (
                                <tr
                                    key={report.symbol}
                                    onClick={() => setExpanded(isOpen ? null : report.symbol)}
                                    className="border-b cursor-pointer border-white/10 last:border-0 hover:bg-white/5"
                                >
                                    <td className="px-4 py-3 tabular-nums opacity-60">{report.rank}</td>
                                    {/* Latin names and signed numbers need an explicit LTR
                                        direction, or bidi reordering moves the trailing
                                        period and the minus sign to the wrong end. */}
                                    <td className="px-4 py-3" dir="ltr" align="right">
                                        <div className="font-semibold">{report.symbol}</div>
                                        <div className="text-xs opacity-60">{report.name}</div>
                                    </td>
                                    <td className="px-4 py-3 tabular-nums" dir="ltr" align="right">
                                        {formatValue(report.price)}
                                    </td>
                                    <td
                                        dir="ltr"
                                        align="right"
                                        className={`px-4 py-3 tabular-nums ${
                                            yearReturn >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}
                                    >
                                        {Number.isFinite(yearReturn) ? `${yearReturn.toFixed(1)}%` : '—'}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">{report.technical?.score ?? '—'}</td>
                                    <td className="px-4 py-3 tabular-nums">{report.fundamental?.score ?? '—'}</td>
                                    <td className="px-4 py-3 font-bold tabular-nums">{report.overall?.score ?? '—'}</td>
                                    <td className="px-4 py-3">{report.overall?.verdict ?? '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {expanded && (
                <div className="p-6 rounded-lg bg-white/5">
                    <ReportView report={payload.ranking.find((report) => report.symbol === expanded)} />
                </div>
            )}

            {!expanded && <p className="text-sm opacity-60">לחץ על שורה בטבלה כדי לפתוח את הניתוח המלא.</p>}

            {payload.failures?.length > 0 && (
                <div className="p-4 text-sm rounded-lg bg-yellow-500/15 border border-yellow-400/40">
                    לא הצלחתי לנתח:{' '}
                    {payload.failures.map((failure) => `${failure.symbol} (${failure.error})`).join(', ')}
                </div>
            )}

            <div className="flex flex-wrap gap-6">
                {payload.ranking.map((report) => (
                    <ScoreGauge
                        key={report.symbol}
                        score={report.overall?.score}
                        verdict={report.overall?.verdict}
                        tone={report.overall?.tone}
                        label={report.symbol}
                        size={100}
                    />
                ))}
            </div>
        </div>
    );
}
