'use client';

import { useState } from 'react';

export function ApproveForm({ id, token, attemptsLeft }) {
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(null);

    async function submit(approve) {
        setBusy(true);
        setError(null);
        try {
            const response = await fetch('/api/whatsapp/purchase', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id, token, pin, approve })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'משהו השתבש. נסו שוב.');
            setDone(approve ? 'approved' : 'rejected');
        } catch (err) {
            setError(err.message);
            setPin('');
        } finally {
            setBusy(false);
        }
    }

    if (done) {
        return (
            <p className="rounded-xl bg-emerald-50 p-4 text-center font-bold text-emerald-900">
                {done === 'approved' ? '✅ אושר. הקישור לתשלום נשלח אליך בוואטסאפ.' : '❌ הרכישה בוטלה.'}
            </p>
        );
    }
    const ready = /^\d{6,}$/.test(pin) && !busy;
    return (
        <form onSubmit={(e) => (e.preventDefault(), ready && submit(true))} className="space-y-3">
            <label className="block">
                <span className="mb-1 block text-sm font-bold">הקוד האישי שלך</span>
                <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    dir="ltr"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em]"
                    placeholder="••••••"
                />
            </label>
            {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
            {attemptsLeft < 5 && !error && <p className="text-sm text-slate-500">נשארו {attemptsLeft} ניסיונות.</p>}
            <div className="flex gap-3">
                <button type="submit" disabled={!ready} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-40">
                    לאשר
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => submit(false)}
                    className="flex-1 rounded-xl bg-slate-200 py-3 font-bold text-slate-800 disabled:opacity-40"
                >
                    לבטל
                </button>
            </div>
        </form>
    );
}
