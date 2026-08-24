'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from 'components/bot/keys';
import { KeyBox } from 'components/bot/key-box';

// Shows the live state of the fundamentals provider in plain Hebrew. It runs
// its own check rather than reading a build-time flag, so it reports what the
// deployed function actually sees.
export function FinnhubBanner() {
    const [state, setState] = useState({ status: 'loading' });

    async function check() {
        setState({ status: 'loading' });
        try {
            const response = await apiFetch('/api/setup-status');
            setState({ status: 'done', payload: await response.json() });
        } catch {
            setState({ status: 'done', payload: { ok: false, headline: 'לא הצלחתי לבדוק את מצב הספק', detail: '' } });
        }
    }

    useEffect(() => {
        check();
    }, []);

    if (state.status === 'loading') {
        return <div className="p-3 text-sm rounded-lg bg-white/5 animate-pulse">בודק את מצב הנתונים הפונדמנטליים…</div>;
    }

    const { payload } = state;
    if (payload.full) {
        return (
            <div className="p-3 text-sm rounded-lg bg-green-500/15 border border-green-400/40">
                ✅ <strong>{payload.headline}.</strong> {payload.prices.detail}
            </div>
        );
    }

    // Prices are the blocking dependency, so when they are the thing missing the
    // fix belongs right here rather than behind a link to another page — sending
    // someone elsewhere to solve it is what made this take three rounds before.
    if (!payload.ready) {
        return (
            <div className="flex flex-col gap-3">
                <div className="p-3 text-sm rounded-lg bg-yellow-500/15 border border-yellow-400/40">
                    ⚠️ <strong>{payload.headline}.</strong>
                </div>
                <KeyBox compact />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-4 text-sm rounded-lg bg-yellow-500/15 border border-yellow-400/40">
            <div>
                ⚠️ <strong>{payload.headline}.</strong>
            </div>
            <p className="leading-relaxed opacity-90">{payload.fundamentals.detail}</p>
            <a href="/setup" className="self-start px-3 py-1 rounded bg-white/10">
                פתח את דף ההגדרות
            </a>
        </div>
    );
}
