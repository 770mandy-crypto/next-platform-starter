'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Picks up to three neighborhoods; the choice lives in the URL so a
// comparison can be shared as a link.
export function ComparePicker({ areas, cities, ids, colors }) {
    const router = useRouter();
    const byId = Object.fromEntries(areas.map((a) => [a.id, a]));
    const [slots, setSlots] = useState(() => [0, 1, 2].map((i) => ({ city: byId[ids[i]]?.city ?? '', id: ids[i] ?? '' })));

    function update(i, patch) {
        const next = slots.map((s, j) => (j === i ? { ...s, ...patch } : s));
        setSlots(next);
        const chosen = next.map((s) => s.id).filter(Boolean);
        router.replace(`/matzpen/compare${chosen.length ? `?ids=${chosen.join(',')}` : ''}`, { scroll: false });
    }

    const field = 'w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm';
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {slots.map((slot, i) => (
                <div key={i} className="space-y-2 rounded-2xl border-2 bg-white p-3" style={{ borderColor: colors[i] }}>
                    <select value={slot.city} onChange={(e) => update(i, { city: e.target.value, id: '' })} className={field} aria-label={`עיר ${i + 1}`}>
                        <option value="">בחרו עיר</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <select value={slot.id} disabled={!slot.city} onChange={(e) => update(i, { id: e.target.value })} className={field} aria-label={`שכונה ${i + 1}`}>
                        <option value="">בחרו שכונה</option>
                        {areas
                            .filter((a) => a.city === slot.city)
                            .sort((a, b) => a.name.localeCompare(b.name, 'he'))
                            .map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({a.score})
                                </option>
                            ))}
                    </select>
                </div>
            ))}
        </div>
    );
}
