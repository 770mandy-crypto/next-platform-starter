'use client';

import { useState } from 'react';
import { buy, CATEGORIES, equip, isEquipped, owns } from 'lib/game/catalog';

// Stat bars, scaled against the best item in the category.
const STATS = {
    weapons: [
        ['נזק', (i) => i.damage * (i.splash ? 1.6 : 1), 6.5],
        ['קצב אש', (i) => i.rate, 11]
    ],
    cars: [
        ['מהירות', (i) => i.maxSpeed, 460],
        ['תאוצה', (i) => i.accel, 560],
        ['שריון', (i) => i.health, 190]
    ],
    characters: []
};

function Bar({ label, value, max }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-14 shrink-0 text-slate-400">{label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <span className="block h-full rounded-full bg-gradient-to-l from-fuchsia-500 to-cyan-400" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
            </span>
        </div>
    );
}

export function Shop({ save, onChange, onClose }) {
    const [tab, setTab] = useState('weapons');
    const [message, setMessage] = useState(null);
    const category = CATEGORIES.find((c) => c.id === tab);

    function act(item) {
        const result = owns(save, tab, item.id) ? equip(save, tab, item.id) : buy(save, tab, item.id);
        if (!result.ok) {
            setMessage(result.reason);
            return;
        }
        setMessage(owns(save, tab, item.id) ? `${item.name} מצויד.` : `קנית ${item.name}! 🎉`);
        onChange(result.save);
    }

    return (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-slate-950/95 backdrop-blur">
            <div className="mx-auto max-w-3xl px-4 py-6">
                <div className="mb-5 flex items-center gap-3">
                    <h1 className="flex-1 bg-gradient-to-l from-fuchsia-400 to-cyan-300 bg-clip-text text-3xl font-black text-transparent">החנות</h1>
                    <span className="rounded-full bg-amber-400/15 px-4 py-1.5 text-lg font-black text-amber-300">🪙 {save.coins}</span>
                    <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700">
                        חזרה למשחק
                    </button>
                </div>

                <div className="mb-4 flex gap-2">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                                setTab(c.id);
                                setMessage(null);
                            }}
                            className={`flex-1 rounded-xl py-2.5 font-bold ${tab === c.id ? 'bg-fuchsia-600' : 'bg-slate-800 hover:bg-slate-700'}`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {message && <p className="mb-4 rounded-xl bg-slate-800 p-3 text-center font-bold">{message}</p>}

                <div className="grid gap-3 sm:grid-cols-2">
                    {category.items.map((item) => {
                        const mine = owns(save, tab, item.id);
                        const active = isEquipped(save, tab, item.id);
                        const affordable = save.coins >= item.price;
                        return (
                            <div key={item.id} className={`rounded-2xl p-4 ring-1 ${active ? 'bg-fuchsia-950/60 ring-fuchsia-500' : 'bg-slate-900 ring-slate-800'}`}>
                                <div className="mb-2 flex items-center gap-3">
                                    <span className="grid size-14 place-items-center rounded-xl text-3xl" style={{ background: `${item.color}22`, boxShadow: `0 0 18px ${item.color}55` }}>
                                        {item.icon}
                                    </span>
                                    <div className="flex-1">
                                        <div className="text-lg font-black">{item.name}</div>
                                        <div className="text-sm text-slate-400">{item.blurb ?? item.perk}</div>
                                    </div>
                                </div>
                                <div className="mb-3 space-y-1">
                                    {STATS[tab].map(([label, get, max]) => (
                                        <Bar key={label} label={label} value={get(item)} max={max} />
                                    ))}
                                    {tab === 'characters' && <p className="text-sm text-emerald-300">✨ {item.perk}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => act(item)}
                                    disabled={active || (!mine && !affordable)}
                                    className={`w-full rounded-xl py-2 font-black ${
                                        active ? 'bg-fuchsia-600/40 text-fuchsia-200' : mine ? 'bg-cyan-600 hover:bg-cyan-500' : affordable ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'bg-slate-800 text-slate-500'
                                    }`}
                                >
                                    {active ? 'בשימוש ✓' : mine ? 'לצייד' : item.price === 0 ? 'חינם' : `לקנות · 🪙 ${item.price}`}
                                </button>
                            </div>
                        );
                    })}
                </div>
                <p className="mt-6 text-center text-xs text-slate-500">מטבעות מרוויחים רק במשחק: אוספים אותם ברחובות ומרחפנים שהופלו. אין כאן כסף אמיתי.</p>
            </div>
        </div>
    );
}
