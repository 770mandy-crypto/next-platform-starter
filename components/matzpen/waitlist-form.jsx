'use client';

import { useState } from 'react';

// Submits to Netlify Forms (the form is registered in public/__forms.html).
export function WaitlistForm({ cities }) {
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
        return <div className="rounded-2xl bg-white/10 p-6 text-lg font-bold">🎉 נרשמתם! נעדכן אתכם.</div>;
    }

    const field = 'rounded-xl bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400';
    return (
        <form name="matzpen-waitlist" onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-3 text-right">
            <input type="hidden" name="form-name" value="matzpen-waitlist" />
            <div className="grid gap-3 sm:grid-cols-2">
                <input name="name" required placeholder="שם" className={field} />
                <input name="email" type="email" required placeholder="אימייל" className={field} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <select name="role" defaultValue="" required className={field}>
                    <option value="" disabled>
                        אני...
                    </option>
                    <option value="buyer">מחפש/ת דירה לגור</option>
                    <option value="investor">משקיע/ה</option>
                    <option value="owner">בעל/ת דירה</option>
                </select>
                <select name="city" defaultValue="" className={field}>
                    <option value="">עיר שמעניינת אותי (לא חובה)</option>
                    {cities.map((c) => (
                        <option key={c.id} value={c.name}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>
            <button type="submit" disabled={status === 'pending'} className="rounded-xl bg-white px-6 py-4 text-lg font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">
                {status === 'pending' ? 'שולח...' : 'עדכנו אותי'}
            </button>
            {status === 'error' && <p className="text-center text-rose-200">משהו השתבש. נסו שוב בעוד רגע.</p>}
        </form>
    );
}
