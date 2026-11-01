'use client';

import MarkdownToJsx from 'markdown-to-jsx';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';

const AreaMap = dynamic(() => import('./area-map').then((m) => m.AreaMap), {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center text-slate-400">טוען מפה...</div>
});

const SIGNAL_ICONS = { transport: '🚆', renewal: '🏗️', development: '🌳', employment: '💼' };
const PART_LABELS = {
    momentum: 'מגמת מחיר',
    gap: 'זול מממוצע העיר',
    yield: 'תשואה משכירות',
    signals: 'מנועי צמיחה',
    liquidity: 'כמות עסקאות',
    risks: 'סיכונים'
};
const STARTERS = [
    'יש לי 1.8 מיליון ואני רוצה להשקיע. איפה כדאי?',
    'איפה כדאי לקנות 4 חדרים לגור בתקציב של 2.5 מיליון?',
    'מה השכונות הכי חזקות בחיפה?',
    'למה הדר מקבלת ציון גבוה?'
];

const formatIls = (n) => `₪${Math.round(n).toLocaleString('he-IL')}`;

export function Explorer({ areas, cities, isSample }) {
    const [tab, setTab] = useState('agent');
    const [city, setCity] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [highlightIds, setHighlightIds] = useState([]);

    const visible = useMemo(() => (city ? areas.filter((a) => a.city === city) : areas), [areas, city]);
    const selected = areas.find((a) => a.id === selectedId) ?? null;

    function select(id) {
        setSelectedId(id);
    }

    return (
        <div className="flex flex-col">
            {isSample && (
                <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
                    ⚠️ גרסת הדגמה: שמות הערים והשכונות אמיתיים, אבל המספרים הם <b>נתוני דוגמה</b> ולא נתוני שוק אמיתיים.
                </div>
            )}
            <div className="mx-auto grid w-full max-w-7xl gap-4 p-4 lg:h-[calc(100dvh-110px)] lg:grid-cols-[420px_minmax(0,1fr)]">
                {/* Map (first in RTL = right side on desktop) */}
                <div className="relative h-[45vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-2 lg:h-auto">
                    <AreaMap areas={areas} selectedId={selectedId} highlightIds={highlightIds} onSelect={select} />
                    <Legend />
                    {selected && <AreaCard area={selected} onClose={() => setSelectedId(null)} />}
                </div>

                {/* Side panel */}
                <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-1 lg:min-h-0">
                    <div className="grid grid-cols-2 border-b border-slate-200 text-sm font-bold">
                        {[
                            ['agent', '💬 הסוכן'],
                            ['ranking', '🏆 דירוג השכונות']
                        ].map(([id, label]) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`py-3 ${tab === id ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {tab === 'agent' ? (
                        <AgentChat onAreas={setHighlightIds} onSelect={select} areas={areas} />
                    ) : (
                        <Ranking areas={visible} cities={cities} city={city} setCity={setCity} onSelect={select} selectedId={selectedId} />
                    )}
                </div>
            </div>
        </div>
    );
}

function Legend() {
    const items = [
        ['#059669', 'עלייה חזקה'],
        ['#65a30d', 'עלייה'],
        ['#d97706', 'יציב'],
        ['#dc2626', 'צמיחה איטית']
    ];
    return (
        <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs shadow">
            {items.map(([color, label]) => (
                <div key={label} className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
                    {label}
                </div>
            ))}
        </div>
    );
}

function ScoreBadge({ area, size = 'md' }) {
    const cls = size === 'lg' ? 'h-14 w-14 text-xl' : 'h-10 w-10 text-sm';
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-full font-black text-white ${cls}`} style={{ background: area.trend.color }}>
            {area.score}
        </div>
    );
}

function Ranking({ areas, cities, city, setCity, onSelect, selectedId }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-slate-100 p-3">
                <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="">כל הארץ</option>
                    {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>
            <ol className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                {areas.map((a, i) => (
                    <li key={a.id}>
                        <button
                            onClick={() => onSelect(a.id)}
                            className={`flex w-full items-center gap-3 px-3 py-3 text-right hover:bg-slate-50 ${selectedId === a.id ? 'bg-indigo-50' : ''}`}
                        >
                            <span className="w-5 text-xs text-slate-400">{i + 1}</span>
                            <ScoreBadge area={a} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold">{a.name}</span>
                                <span className="block truncate text-xs text-slate-500">
                                    {a.cityName} · {formatIls(a.pricePerSqm)} למ״ר · <span dir="ltr">{a.change12m > 0 ? '+' : ''}{a.change12m}%</span> בשנה
                                </span>
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function AreaCard({ area, onClose }) {
    return (
        <div className="absolute inset-x-3 bottom-3 z-[500] max-h-[70%] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-3 sm:w-96">
            <div className="mb-3 flex items-start gap-3">
                <ScoreBadge area={area} size="lg" />
                <div className="flex-1">
                    <h3 className="text-lg font-black leading-tight">{area.name}</h3>
                    <div className="text-sm text-slate-500">{area.cityName}</div>
                    <div className="text-sm font-bold" style={{ color: area.trend.color }}>
                        {area.trend.label}
                    </div>
                </div>
                <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700" aria-label="סגירה">
                    ×
                </button>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="מחיר למ״ר" value={formatIls(area.pricePerSqm)} />
                <Stat label="שינוי בשנה" value={`${area.change12m > 0 ? '+' : ''}${area.change12m}%`} />
                <Stat label="תשואה" value={`${area.rentYield}%`} />
            </div>
            <div className="mb-3 text-sm text-slate-600">דירת 90 מ״ר: בערך {formatIls(area.pricePerSqm * 90)}</div>
            {area.signals.length > 0 && (
                <ul className="mb-2 space-y-1 text-sm">
                    {area.signals.map((s) => (
                        <li key={s.text}>
                            {SIGNAL_ICONS[s.kind] ?? '✓'} {s.text}
                        </li>
                    ))}
                </ul>
            )}
            {area.risks.length > 0 && (
                <ul className="mb-3 space-y-1 text-sm text-rose-700">
                    {area.risks.map((r) => (
                        <li key={r}>⚠️ {r}</li>
                    ))}
                </ul>
            )}
            <details className="text-xs text-slate-500">
                <summary className="cursor-pointer font-bold">איך חושב הציון?</summary>
                <ul className="mt-2 space-y-0.5">
                    {Object.entries(area.parts).map(([k, v]) => (
                        <li key={k} className="flex justify-between">
                            <span>{PART_LABELS[k]}</span>
                            <span className={v < 0 ? 'text-rose-600' : ''}>{v > 0 ? `+${v}` : v}</span>
                        </li>
                    ))}
                </ul>
            </details>
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="rounded-xl bg-slate-50 p-2">
            <div className="text-slate-500">{label}</div>
            <div dir="ltr" className="font-bold text-slate-900">{value}</div>
        </div>
    );
}

function AgentChat({ onAreas, onSelect, areas }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [mentioned, setMentioned] = useState([]);
    const scroller = useRef(null);
    const byId = useMemo(() => Object.fromEntries(areas.map((a) => [a.id, a])), [areas]);

    const scrollDown = () => requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));

    async function send(text) {
        const message = text.trim();
        if (!message || busy) return;
        const history = messages.filter((m) => !m.error);
        setMessages([...messages, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
        setInput('');
        setBusy(true);
        setStatus('חושב...');
        setMentioned([]);
        scrollDown();

        const update = (fn) =>
            setMessages((list) => {
                const copy = [...list];
                copy[copy.length - 1] = fn(copy[copy.length - 1]);
                return copy;
            });

        try {
            const res = await fetch('/api/nadlan/agent', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ message, history: history.map(({ role, content }) => ({ role, content })) })
            });
            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'משהו השתבש. נסו שוב.');
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            const seen = new Set();
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const event = JSON.parse(line);
                    if (event.type === 'text') {
                        setStatus(null);
                        update((m) => ({ ...m, content: m.content + event.text }));
                        scrollDown();
                    } else if (event.type === 'tool') {
                        setStatus('בודק את נתוני השכונות...');
                    } else if (event.type === 'areas') {
                        event.ids.forEach((id) => seen.add(id));
                        onAreas([...seen]);
                        setMentioned([...seen]);
                    } else if (event.type === 'refused') {
                        update(() => ({ role: 'assistant', content: 'לא יכולתי לענות על זה. נסו לנסח אחרת.', error: true }));
                    } else if (event.type === 'error') {
                        update(() => ({ role: 'assistant', content: event.message, error: true }));
                    } else if (event.type === 'truncated') {
                        update((m) => ({ ...m, content: `${m.content}\n\n_(התשובה נקטעה)_` }));
                    }
                }
            }
        } catch (error) {
            update(() => ({ role: 'assistant', content: error.message, error: true }));
        } finally {
            setBusy(false);
            setStatus(null);
            scrollDown();
        }
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {messages.length === 0 && (
                    <div className="space-y-3 pt-2">
                        <p className="text-sm text-slate-600">
                            שלום! אני הסוכן של מצפן נדל״ן 🧭 ספרו לי מה התקציב ומה המטרה (לגור או להשקיע), ואמליץ לכם איפה בארץ כדאי לקנות.
                        </p>
                        <div className="flex flex-col gap-2">
                            {STARTERS.map((s) => (
                                <button key={s} onClick={() => send(s)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-right text-sm text-indigo-800 hover:bg-indigo-100">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((m, i) =>
                    m.role === 'user' ? (
                        <div key={i} className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-indigo-600 px-3 py-2 text-sm text-white">
                            {m.content}
                        </div>
                    ) : m.content ? (
                        <div key={i} className={`max-w-[95%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm ${m.error ? 'bg-rose-50 text-rose-800' : 'bg-slate-100'}`}>
                            <MarkdownToJsx className="chat-md" options={{ forceBlock: true }}>
                                {m.content}
                            </MarkdownToJsx>
                        </div>
                    ) : null
                )}
                {status && <div className="animate-pulse text-xs text-slate-500">{status}</div>}
                {mentioned.length > 0 && !busy && (
                    <div className="flex flex-wrap gap-1.5">
                        {mentioned.slice(0, 8).map((id) =>
                            byId[id] ? (
                                <button key={id} onClick={() => onSelect(id)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs hover:border-indigo-400">
                                    📍 {byId[id].name}, {byId[id].cityName}
                                </button>
                            ) : null
                        )}
                    </div>
                )}
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                }}
                className="flex gap-2 border-t border-slate-200 p-3"
            >
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="למשל: יש לי 2 מיליון, איפה כדאי להשקיע?"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    שליחה
                </button>
            </form>
        </div>
    );
}
