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
            <div className="p-6 rounded-xl bg-sand/70">
                <h2 className="text-xl font-display">תודה, קיבלנו את ההודעה</h2>
                <p className="mt-2 text-mocha">נחזור אלייך תוך יום עסקים אחד.</p>
                <button type="button" onClick={() => setStatus('idle')} className="mt-4 btn-ghost">
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
                    <span className="font-semibold">שם מלא</span>
                    <input name="name" type="text" required autoComplete="name" className="field" />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                    <span className="font-semibold">אימייל</span>
                    <input name="email" type="email" required autoComplete="email" dir="ltr" className="field" />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                    <span className="font-semibold">טלפון (לא חובה)</span>
                    <input name="phone" type="tel" autoComplete="tel" dir="ltr" className="field" />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                    <span className="font-semibold">נושא</span>
                    <select name="subject" className="field" defaultValue="שאלה כללית">
                        <option>שאלה כללית</option>
                        <option>קביעת מדידה בבוטיק</option>
                        <option>שאלה על הזמנה קיימת</option>
                        <option>החזרה או החלפה</option>
                        <option>שיתוף פעולה</option>
                    </select>
                </label>
            </div>

            <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold">ההודעה שלך</span>
                <textarea name="message" required rows={6} className="field resize-y" />
            </label>

            <button type="submit" disabled={status === 'pending'} className="self-start btn-clay sm:min-w-48">
                {status === 'pending' ? 'שולח…' : 'שליחה'}
            </button>

            {status === 'error' && (
                <p role="alert" className="text-sm text-red-700">
                    השליחה נכשלה ({error}). אפשר לנסות שוב או לכתוב לנו ישירות במייל.
                </p>
            )}
        </form>
    );
}
