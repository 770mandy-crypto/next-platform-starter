'use client';

import { useEffect, useState } from 'react';
import { apiFetch, readKey, writeKey } from 'components/bot/keys';

// Paste a key, press a button, the site works. No host settings, no redeploy.
//
// The check after saving is a real request, not a stored flag: the three ways a
// key fails — never arrived, rejected, quota spent — need three different fixes
// and only a live call tells them apart. Reporting them as one "not working" is
// what turned earlier debugging into repeated guessing.
export function KeyBox({ compact = false }) {
    const [value, setValue] = useState('');
    const [finnhub, setFinnhub] = useState('');
    const [state, setState] = useState({ status: 'idle' });

    useEffect(() => {
        setValue(readKey('twelvedata'));
        setFinnhub(readKey('finnhub'));
    }, []);

    async function save(event) {
        event?.preventDefault();
        const stored = writeKey('twelvedata', value) && writeKey('finnhub', finnhub);
        if (!stored) {
            setState({
                status: 'blocked',
                message: 'הדפדפן חוסם שמירה מקומית. נסה חלון רגיל במקום גלישה פרטית.'
            });
            return;
        }

        setState({ status: 'checking' });
        try {
            const response = await apiFetch('/api/setup-status');
            const payload = await response.json();
            setState({ status: payload.ready ? 'ok' : 'bad', payload });
        } catch {
            setState({ status: 'bad', payload: null });
        }
    }

    return (
        <form onSubmit={save} className="flex flex-col gap-4 p-5 border rounded-lg bg-white/5 border-white/15">
            <div>
                <div className="text-lg font-bold">הדבק מפתח והאתר יעבוד</div>
                <p className="mt-1 text-sm opacity-80">
                    המפתח נשמר <strong>בדפדפן שלך בלבד</strong> ונשלח רק לספק הנתונים שאליו הוא שייך. אין מה להגדיר
                    בשרת ואין צורך לפרוס מחדש.
                </p>
            </div>

            <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold">מפתח מחירים — Twelve Data (חובה)</span>
                <input
                    dir="ltr"
                    type="password"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="abc123def456…"
                    className="px-3 py-2 rounded bg-black/30 border border-white/20 font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                />
            </label>

            {!compact && (
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-semibold">מפתח נתוני חברות — Finnhub (רשות, אפשר להשאיר ריק)</span>
                    <input
                        dir="ltr"
                        type="password"
                        value={finnhub}
                        onChange={(event) => setFinnhub(event.target.value)}
                        placeholder="xxxxxxxxxxxxxxxxxxxx"
                        className="px-3 py-2 rounded bg-black/30 border border-white/20 font-mono text-sm"
                        autoComplete="off"
                        spellCheck={false}
                    />
                </label>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    disabled={state.status === 'checking'}
                    className="px-5 py-3 font-bold rounded bg-primary text-primary-content disabled:opacity-50"
                >
                    {state.status === 'checking' ? 'בודק…' : 'שמור והפעל'}
                </button>
                <a
                    href="https://twelvedata.com/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary"
                >
                    אין לך מפתח? הרשמה חינם ←
                </a>
            </div>

            {state.status === 'ok' && (
                <div className="p-3 text-sm rounded bg-green-500/15 border border-green-400/40">
                    ✅ עובד. אפשר לעבור ל<a href="/bot" className="text-primary">אנליסט</a> או ל
                    <a href="/market" className="text-primary">מפת השוק</a>.
                </div>
            )}
            {state.status === 'blocked' && (
                <div className="p-3 text-sm rounded bg-red-500/15 border border-red-400/40">{state.message}</div>
            )}
            {state.status === 'bad' && (
                <div className="p-3 text-sm rounded bg-red-500/15 border border-red-400/40">
                    ❌ {state.payload?.prices?.headline || 'הבדיקה נכשלה.'}
                    <div className="mt-1 opacity-80">{state.payload?.prices?.detail}</div>
                </div>
            )}
        </form>
    );
}
