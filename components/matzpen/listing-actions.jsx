'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ContactOwner({ id, name }) {
    const [contact, setContact] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function reveal() {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/matzpen/listings/${id}/contact`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'משהו השתבש.');
            setContact(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    if (contact) {
        return (
            <div className="grid gap-2 sm:grid-cols-2">
                <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-green-500 py-3 text-center font-bold text-white no-underline hover:bg-green-600">
                    💬 וואטסאפ ל{contact.name}
                </a>
                <a href={`tel:${contact.phone}`} className="rounded-xl border-2 border-slate-300 py-3 text-center font-bold text-slate-800 no-underline" dir="ltr">
                    📞 {contact.phone}
                </a>
            </div>
        );
    }
    return (
        <>
            <button onClick={reveal} disabled={busy} className="w-full rounded-xl bg-indigo-600 py-3 text-lg font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                {busy ? '...' : `📞 דברו עם בעל הדירה (${name})`}
            </button>
            {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
        </>
    );
}

export function DeleteListing({ id, token }) {
    const router = useRouter();
    const [state, setState] = useState(null);
    async function remove() {
        if (!confirm('למחוק את המודעה? אי אפשר לבטל.')) return;
        setState('pending');
        const res = await fetch(`/api/matzpen/listings/${id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
        if (res.ok) router.push('/matzpen/listings');
        else setState('error');
    }
    return (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-bold">זו המודעה שלכם. הדירה נמכרה?</p>
            <button onClick={remove} disabled={state === 'pending'} className="rounded-lg bg-rose-600 px-4 py-2 font-bold text-white">
                מחיקת המודעה
            </button>
            {state === 'error' && <p className="mt-2 text-rose-700">המחיקה נכשלה.</p>}
        </div>
    );
}
