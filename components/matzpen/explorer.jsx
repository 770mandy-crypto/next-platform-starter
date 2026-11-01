'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AgentChat } from './agent-chat';
import { formatPct, formatPrice, SIGNAL_ICONS } from './format';
import { MapView } from './map-view';
import { ScoreBadge } from './score-badge';
import { Stat } from './stat';

export function Explorer({ areas, cities }) {
    const [tab, setTab] = useState('agent');
    const [city, setCity] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [highlightIds, setHighlightIds] = useState([]);

    const visible = useMemo(() => (city ? areas.filter((a) => a.city === city) : areas), [areas, city]);
    const selected = areas.find((a) => a.id === selectedId) ?? null;
    const unplaced = areas.filter((a) => !Number.isFinite(a.lat)).length;

    return (
        <div className="mx-auto grid w-full max-w-7xl gap-4 p-4 lg:h-[calc(100dvh-120px)] lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="relative h-[45vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-2 lg:h-auto">
                <MapView areas={areas} selectedId={selectedId} highlightIds={highlightIds} onSelect={setSelectedId} />
                <Legend unplaced={unplaced} />
                {selected && <AreaCard area={selected} onClose={() => setSelectedId(null)} />}
            </div>

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
                {/* Both stay mounted so the conversation survives switching tabs. */}
                <div className={tab === 'agent' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
                    <AgentChat areas={areas} onAreas={setHighlightIds} onSelect={setSelectedId} compact />
                </div>
                <div className={tab === 'ranking' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
                    <Ranking areas={visible} cities={cities} city={city} setCity={setCity} onSelect={setSelectedId} selectedId={selectedId} />
                </div>
            </div>
        </div>
    );
}

function Legend({ unplaced }) {
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
            {unplaced > 0 && <div className="mt-1 max-w-36 text-[10px] text-slate-500">{unplaced} שכונות עוד בלי מיקום במפה, הן מופיעות בדירוג</div>}
        </div>
    );
}

function Ranking({ areas, cities, city, setCity, onSelect, selectedId }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-slate-100 p-3">
                <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="">כל הארץ ({cities.reduce((s, c) => s + c.areaCount, 0)} שכונות)</option>
                    {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name} ({c.areaCount})
                        </option>
                    ))}
                </select>
            </div>
            <ol className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                {areas.map((a, i) => (
                    <li key={a.id}>
                        <button onClick={() => onSelect(a.id)} className={`flex w-full items-center gap-3 px-3 py-3 text-right hover:bg-slate-50 ${selectedId === a.id ? 'bg-indigo-50' : ''}`}>
                            <span className="w-6 text-xs text-slate-400">{i + 1}</span>
                            <ScoreBadge area={a} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold">{a.name}</span>
                                <span className="block truncate text-xs text-slate-500">
                                    {a.cityName} · {formatPrice(a.price)} · <span dir="ltr">{formatPct(a.change12m)}</span> בשנה
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
        <div className="absolute inset-x-3 bottom-3 z-[500] max-h-[75%] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-3 sm:w-96">
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
                <Stat label="מחיר חציוני" value={formatPrice(area.price)} />
                <Stat label="שינוי בשנה" value={formatPct(area.change12m)} />
                <Stat label="תשואה" value={Number.isFinite(area.rentYield) ? `${area.rentYield}%` : '—'} />
            </div>
            {area.signals.length > 0 && (
                <ul className="mb-2 space-y-1 text-sm">
                    {area.signals.slice(0, 3).map((s) => (
                        <li key={s.text}>
                            {SIGNAL_ICONS[s.kind] ?? '✓'} {s.text}
                        </li>
                    ))}
                </ul>
            )}
            {area.risks.length > 0 && (
                <ul className="mb-3 space-y-1 text-sm text-rose-700">
                    {area.risks.slice(0, 2).map((r) => (
                        <li key={r}>⚠️ {r}</li>
                    ))}
                </ul>
            )}
            <div className="grid grid-cols-2 gap-2">
                <Link href={`/matzpen/area/${area.id}`} className="rounded-xl bg-indigo-600 py-2 text-center text-sm font-bold text-white no-underline hover:bg-indigo-700">
                    לעמוד השכונה
                </Link>
                <Link href={`/matzpen/listings?area=${area.id}`} className="rounded-xl border border-slate-200 py-2 text-center text-sm font-bold text-slate-800 no-underline hover:border-slate-400">
                    🏠 דירות למכירה
                </Link>
            </div>
        </div>
    );
}
