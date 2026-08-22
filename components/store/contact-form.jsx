'use client';

import { useState } from 'react';

/*
Submits to Netlify Forms. The form is declared in public/__forms.html so Netlify's
build-time form detection picks it up even though the page itself is React-rendered.
*/
export function ContactForm() {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus('pending');
        setError(null);

        try {
            const formData = new FormData(event.target);
            const response = await fetch('/__forms.html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString()
            });

            if (response.ok) {
                setStatus('ok');
                event.target.reset();
            } else {
                setStatus('error');
                setError(`${response.status} ${response.statusText}`);
            }
        } catch (submitError) {
            setStatus('error');
            setError(String(submitError));
        }
    }

    if (status === 'ok') {
        return (
            <div className="p-8 border hairline" style={{ background: 'var(--color-ink-2)' }}>
                <p className="eyebrow">נשלח</p>
                <h2 className="mt-3 text-2xl">תודה, קיבלנו את ההודעה</h2>
                <p className="mt-3 text-muted">נחזור אליכם תוך יום עסקים אחד.</p>
                <button type="button" onClick={() => setStatus('idle')} className="mt-7 btn-line">
                    שליחת הודעה נוספת
                </button>
            </div>
        );
    }

    return (
        <form name="contact" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="form-name" value="contact" />

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                    <span className="text-[0.62rem] font-semibold tracking-[0.24em] uppercase text-gold">שם מלא</span>
                    <input name="name" type="text" required autoComplete="name" className="field" />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                    <span className="text-[0.62rem] font-semibold tracking-[0.24em] uppercase text-gold">אימייל</span>
                    <input name="email" type="email" required autoComplete="email" dir="ltr" className="field" />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                    <span className="text-[0.62rem] font-semibold tracking-[0.24em] uppercase text-gold">טלפון (לא חובה)</span>
                    <input name="phone" type="tel" autoComplete="tel" dir="ltr" className="field" />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                    <span className="text-[0.62rem] font-semibold tracking-[0.24em] uppercase text-gold">נושא</span>
                    <select name="subject" className="field" defaultValue="שאלה כללית">
                        <option>שאלה כללית</option>
                        <option>שאלה על מידה</option>
                        <option>שאלה על הזמנה קיימת</option>
                        <option>החזרה או החלפה</option>
                        <option>שיתוף פעולה</option>
                    </select>
                </label>
            </div>

            <label className="flex flex-col gap-2 text-sm">
                <span className="text-[0.62rem] font-semibold tracking-[0.24em] uppercase text-gold">ההודעה שלך</span>
                <textarea name="message" required rows={7} className="field resize-y" />
            </label>

            <button type="submit" disabled={status === 'pending'} className="self-start btn-gold sm:min-w-56">
                {status === 'pending' ? 'שולח…' : 'שליחה'}
            </button>

            {status === 'error' && (
                <p role="alert" className="text-sm" style={{ color: '#e2a1a1' }}>
                    השליחה נכשלה ({error}). אפשר לנסות שוב או לכתוב לנו ישירות במייל.
                </p>
            )}
        </form>
    );
}
