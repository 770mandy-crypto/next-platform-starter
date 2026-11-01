'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatIls, formatPrice } from './format';

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5';

export function PublishForm({ areas, cities, initialArea }) {
    const start = areas.find((a) => a.id === initialArea);
    const [city, setCity] = useState(start?.city ?? '');
    const [areaId, setAreaId] = useState(start?.id ?? '');
    const [price, setPrice] = useState('');
    const [sqm, setSqm] = useState('');
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const inCity = useMemo(() => areas.filter((a) => a.city === city).sort((a, b) => a.name.localeCompare(b.name, 'he')), [areas, city]);
    const area = areas.find((a) => a.id === areaId);

    async function submit(event) {
        event.preventDefault();
        setStatus('pending');
        setError(null);
        const form = Object.fromEntries(new FormData(event.target));
        try {
            const res = await fetch('/api/matzpen/listings', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...form, consent: form.consent === 'on' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'הפרסום נכשל.');
            setResult(data);
            setStatus('ok');
        } catch (e) {
            setError(e.message);
            setStatus(null);
        }
    }

    if (status === 'ok') {
        const manage = typeof window !== 'undefined' ? `${window.location.origin}${result.manageUrl}` : result.manageUrl;
        return (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <h2 className="text-xl font-black text-emerald-800">🎉 הדירה פורסמה!</h2>
                <Link href={`/matzpen/listings/${result.id}`} className="inline-block rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white no-underline">
                    לצפייה במודעה
                </Link>
                <div className="text-sm">
                    <b>שמרו את הקישור הזה.</b> רק דרכו אפשר למחוק את המודעה (למשל כשהדירה נמכרה):
                    <input readOnly value={manage} className="mt-2 w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs" dir="ltr" onFocus={(e) => e.target.select()} />
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold">
                    עיר
                    <select
                        required
                        value={city}
                        onChange={(e) => {
                            setCity(e.target.value);
                            setAreaId('');
                        }}
                        className={`${field} mt-1 font-normal`}
                    >
                        <option value="">בחרו עיר</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block text-sm font-bold">
                    שכונה
                    <select name="areaId" required value={areaId} onChange={(e) => setAreaId(e.target.value)} disabled={!city} className={`${field} mt-1 font-normal`}>
                        <option value="">בחרו שכונה</option>
                        {inCity.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {area && (
                <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                    ציון הצמיחה של {area.name}: <b>{area.score}</b> · מחיר חציוני: <b>{formatPrice(area.price)}</b>. הקונים יראו את זה ליד המודעה שלכם.
                </p>
            )}
            <label className="block text-sm font-bold">
                רחוב (לא חובה)
                <input name="street" maxLength={60} className={`${field} mt-1 font-normal`} placeholder="למשל: הרצל" />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="block text-sm font-bold">
                    חדרים
                    <input name="rooms" type="number" step="0.5" min="1" max="12" required className={`${field} mt-1 font-normal`} />
                </label>
                <label className="block text-sm font-bold">
                    מ״ר
                    <input name="sqm" type="number" min="15" max="1000" required value={sqm} onChange={(e) => setSqm(e.target.value)} className={`${field} mt-1 font-normal`} />
                </label>
                <label className="block text-sm font-bold">
                    קומה
                    <input name="floor" type="number" min="-2" max="80" className={`${field} mt-1 font-normal`} />
                </label>
                <label className="block text-sm font-bold">
                    מחיר (₪)
                    <input name="price" type="number" min="100000" step="1000" required value={price} onChange={(e) => setPrice(e.target.value)} className={`${field} mt-1 font-normal`} />
                </label>
            </div>
            {price && sqm && <p className="text-xs text-slate-500">{formatIls(price / sqm)} למ״ר</p>}
            <label className="block text-sm font-bold">
                תיאור
                <textarea name="description" maxLength={1500} rows={4} className={`${field} mt-1 font-normal`} placeholder="מצב הדירה, חניה, מעלית, מרפסת, ממ״ד..." />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold">
                    שם
                    <input name="ownerName" required minLength={2} maxLength={60} className={`${field} mt-1 font-normal`} />
                </label>
                <label className="block text-sm font-bold">
                    טלפון
                    <input name="phone" type="tel" required className={`${field} mt-1 font-normal`} placeholder="050-1234567" dir="ltr" />
                </label>
            </div>
            {/* Honeypot for bots; hidden from people and screen readers. */}
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <label className="flex items-start gap-2 text-sm">
                <input name="consent" type="checkbox" required className="mt-1" />
                <span>
                    אני בעל/ת הדירה או מורשה למכור אותה, ומסכים/ה שהטלפון שלי יוצג לקונים שילחצו על ״דברו עם בעל הדירה״, לפי{' '}
                    <Link href="/matzpen/terms">תנאי השימוש</Link>.
                </span>
            </label>
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
            <button type="submit" disabled={status === 'pending'} className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                {status === 'pending' ? 'מפרסם...' : 'פרסום הדירה'}
            </button>
        </form>
    );
}
