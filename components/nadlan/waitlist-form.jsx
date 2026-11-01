'use client';

import { useState } from 'react';

export function WaitlistForm() {
    const [status, setStatus] = useState(null);

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus('pending');
        try {
            const res = await fetch('/__forms.html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(new FormData(event.target)).toString()
            });
            setStatus(res.ok ? 'ok' : 'error');
        } catch {
            setStatus('error');
        }
    }

    if (status === 'ok') {
        return (
            <div className="rounded-2xl bg-white/10 p-6 text-center text-lg font-bold">
                🎉 נרשמת! נעדכן אותך ברגע שנפתח את הגישה המוקדמת.
            </div>
        );
    }

    return (
        <form name="nadlan-waitlist" onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-3 text-right">
            <input type="hidden" name="form-name" value="nadlan-waitlist" />
            <div className="grid gap-3 sm:grid-cols-2">
                <input name="name" required placeholder="שם מלא" className="rounded-xl bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400" />
                <input name="phone" type="tel" required placeholder="טלפון" className="rounded-xl bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400" />
            </div>
            <input name="email" type="email" placeholder="אימייל (לא חובה)" className="rounded-xl bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400" />
            <select name="deals" defaultValue="" className="rounded-xl bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400">
                <option value="" disabled>
                    כמה לידים חדשים מגיעים אליך בחודש?
                </option>
                <option>פחות מ-20</option>
                <option>20–50</option>
                <option>50–150</option>
                <option>יותר מ-150</option>
            </select>
            <button
                type="submit"
                disabled={status === 'pending'}
                className="rounded-xl bg-white px-6 py-4 text-lg font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
            >
                {status === 'pending' ? 'שולח...' : 'אני רוצה גישה מוקדמת'}
            </button>
            {status === 'error' && <p className="text-center text-rose-200">משהו השתבש. נסו שוב בעוד רגע.</p>}
        </form>
    );
}
