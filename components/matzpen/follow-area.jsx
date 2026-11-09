'use client';

import { useState } from 'react';

export function FollowArea({ areaId, areaName }) {
    const [email, setEmail] = useState('');
    const [state, setState] = useState(null);
    const [message, setMessage] = useState(null);

    async function submit(event) {
        event.preventDefault();
        setState('pending');
        setMessage(null);
        try {
            const res = await fetch('/api/matzpen/alerts', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, areaId, website: event.target.website.value })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'משהו השתבש.');
            setState(data.status);
        } catch (e) {
            setMessage(e.message);
            setState(null);
        }
    }

    if (state === 'confirm-sent') return <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">📬 שלחנו לכם מייל אישור. לחצו על הקישור שבו כדי להפעיל את ההתראות.</p>;
    if (state === 'following') return <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">🔔 מעולה, תקבלו עדכונים על {areaName}.</p>;

    return (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="האימייל שלכם"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                dir="ltr"
            />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <button disabled={state === 'pending'} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                🔔 עקבו אחרי השכונה
            </button>
            {message && <p className="text-sm text-rose-700 sm:basis-full">{message}</p>}
        </form>
    );
}

export function UnsubscribeButton({ id, t }) {
    const [state, setState] = useState(null);
    async function go() {
        setState('pending');
        const res = await fetch('/api/matzpen/alerts/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, t }) });
        setState(res.ok ? 'done' : 'error');
    }
    if (state === 'done') return <p className="text-emerald-700">הוסרתם. לא נשלח לכם עוד התראות.</p>;
    return (
        <>
            <button onClick={go} disabled={state === 'pending'} className="rounded-full bg-rose-600 px-6 py-3 font-bold text-white disabled:opacity-60">
                הסירו אותי מכל ההתראות
            </button>
            {state === 'error' && <p className="mt-3 text-rose-700">הקישור לא תקין, או שכבר הוסרתם.</p>}
        </>
    );
}
