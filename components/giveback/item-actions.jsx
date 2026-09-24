'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { useSession } from './session';

// The part of the item page that depends on who is looking: the owner gets the
// status controls, everyone else gets the "I want it" message box.
export function ItemActions({ item }) {
    return item.isOwner ? <OwnerControls item={item} /> : <Contact item={item} />;
}

function Contact({ item }) {
    const router = useRouter();
    const { requireUser } = useSession();
    const [text, setText] = useState(`היי ${item.ownerName}, ה${item.title} עוד רלוונטי? אשמח לבוא לאסוף 🙏`);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (item.status === 'given') {
        return (
            <p className="p-4 rounded-lg bg-white/5">
                הפריט הזה כבר נמסר. <Link href="/giveback">לחיפוש פריטים אחרים</Link>
            </p>
        );
    }

    async function send(event) {
        event.preventDefault();
        setError('');
        try {
            await requireUser();
        } catch {
            return;
        }
        setBusy(true);
        try {
            const { id } = await api('/conversations', { method: 'POST', body: { itemId: item.id, text } });
            router.push(`/giveback/messages/${id}`);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <form onSubmit={send} className="flex flex-col gap-3 p-4 border rounded-xl border-primary/40 bg-primary/5">
            <h3>💬 רוצה את זה?</h3>
            {item.status === 'reserved' && (
                <p className="text-sm text-yellow-200">הפריט שמור כרגע למישהו אחר — אפשר עדיין לכתוב ולהיכנס לתור.</p>
            )}
            <textarea
                className="input min-h-20"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button className="btn" disabled={busy || !text.trim()}>
                {busy ? 'שולח…' : `שליחת הודעה ל${item.ownerName}`}
            </button>
            <p className="text-xs opacity-70">הכתובת המדויקת תגיע בצ׳אט, עם כפתור ניווט ב-Waze.</p>
        </form>
    );
}

function OwnerControls({ item: initial }) {
    const router = useRouter();
    const [item, setItem] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function setStatus(status) {
        setBusy(true);
        setError('');
        try {
            const res = await api(`/items/${item.id}`, { method: 'PATCH', body: { status } });
            setItem(res.item);
            router.refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex flex-col gap-3 p-4 border rounded-xl border-white/15 bg-white/5">
            <h3>זה הפריט שלך</h3>
            {item.address ? (
                <p className="text-sm opacity-80">🔒 כתובת שמורה (פרטית): {item.address}</p>
            ) : (
                <p className="text-sm opacity-80">לא נשמרה כתובת — תוכלו לכתוב אותה בצ׳אט כשתלחצו ״שלח כתובת״.</p>
            )}
            <div className="flex flex-wrap gap-2">
                {item.status !== 'given' && (
                    <button className="btn" disabled={busy} onClick={() => setStatus('given')}>
                        🎉 נמסר!
                    </button>
                )}
                {item.status === 'available' && (
                    <button className="btn bg-yellow-300" disabled={busy} onClick={() => setStatus('reserved')}>
                        שמור למישהו
                    </button>
                )}
                {item.status !== 'available' && (
                    <button className="btn bg-white" disabled={busy} onClick={() => setStatus('available')}>
                        החזרה לזמין
                    </button>
                )}
            </div>
            {item.status === 'given' && <p className="text-sm text-green-200">תודה שמסרת! הפריט הוסר מהחיפוש. 💚</p>}
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Link href="/giveback/messages" className="text-sm">
                להודעות שקיבלת על הפריט →
            </Link>
        </div>
    );
}
