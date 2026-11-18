'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STATUS_TEXT = {
    connected: 'Gmail חובר.',
    denied: 'החיבור ל-Google בוטל.',
    expired: 'הבקשה לחיבור פגה. נסו שוב.',
    failed: 'החיבור ל-Google נכשל. נסו שוב.',
    'no-refresh-token': 'Google לא החזיר הרשאה קבועה. נסו שוב ואשרו את הגישה.'
};

async function call(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: { 'content-type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `שגיאה ${response.status}`);
    return data;
}

export default function InboxPage() {
    const [status, setStatus] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [busy, setBusy] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function loadDrafts() {
        const data = await call('/api/google/inbox');
        setDrafts(data.drafts);
    }

    useEffect(() => {
        const result = new URLSearchParams(window.location.search).get('google');
        if (result) setMessage(STATUS_TEXT[result] ?? '');
        call('/api/google/status')
            .then(setStatus)
            .catch((e) => setError(e.message));
    }, []);

    useEffect(() => {
        if (status?.connected) loadDrafts().catch((e) => setError(e.message));
    }, [status?.connected]);

    async function run(label, work) {
        setBusy(label);
        setError('');
        setMessage('');
        try {
            await work();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy('');
        }
    }

    const connect = () =>
        run('connect', async () => {
            const { url } = await call('/api/google/connect', { method: 'POST' });
            window.location.href = url;
        });

    const check = () =>
        run('check', async () => {
            const report = await call('/api/google/inbox', { method: 'POST' });
            setMessage(
                `נבדקו ${report.checked} מיילים. נוצרו ${report.drafts.length} טיוטות חדשות${report.skipped ? `, דולגו ${report.skipped}` : ''}.` +
                    (report.stoppedByQuota ? ' הגעתם למכסת היום, הבאים ייבדקו מחר.' : '')
            );
            await loadDrafts();
        });

    const save = (draft, body) =>
        run(`save-${draft.id}`, async () => {
            await call(`/api/google/drafts/${draft.id}`, { method: 'PUT', body: { body } });
            setMessage('הטיוטה נשמרה. עוד לא נשלחה.');
            await loadDrafts();
        });

    const discard = (draft) =>
        run(`discard-${draft.id}`, async () => {
            await call(`/api/google/drafts/${draft.id}`, { method: 'DELETE' });
            await loadDrafts();
        });

    const send = (draft) => {
        if (!window.confirm(`לשלוח את המייל ל-${draft.to}?\n\nהמייל יישלח מהחשבון שלך ואי אפשר לבטל את השליחה.`)) return;
        run(`send-${draft.id}`, async () => {
            await call('/api/google/send', { method: 'POST', body: { draftId: draft.id, confirm: true } });
            setMessage('המייל נשלח.');
            await loadDrafts();
        });
    };

    return (
        <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">תיבת הדואר</h1>
                <p className="text-slate-600">
                    הסוכנים קוראים את המיילים החדשים, מסכמים, ומכינים טיוטה. שום דבר לא נשלח בלי שתאשר כל מייל.
                </p>
                <nav className="flex flex-wrap gap-3 text-sm">
                    <Link className="underline" href="/agents/chat">
                        צ׳אט עם הסוכנים
                    </Link>
                    <Link className="underline" href="/whatsapp/simulator">
                        הוואטסאפ בתוך האתר
                    </Link>
                </nav>
            </header>

            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
            {message && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}

            {status && !status.configured && (
                <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
                    החיבור ל-Google עדיין לא מוגדר באתר. צריך להגדיר GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI ו-GOOGLE_TOKEN_KEY.
                </p>
            )}

            {status?.configured && !status.connected && (
                <button onClick={connect} disabled={!!busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
                    חבר את Gmail
                </button>
            )}

            {status?.connected && (
                <>
                    <button onClick={check} disabled={!!busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
                        {busy === 'check' ? 'בודק…' : 'בדוק את תיבת הדואר'}
                    </button>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">טיוטות ממתינות</h2>
                        {drafts.length === 0 && <p className="text-slate-500">אין טיוטות. לחץ על "בדוק את תיבת הדואר".</p>}
                        {drafts.map((draft) => (
                            <DraftCard
                                key={draft.id}
                                draft={draft}
                                busy={busy}
                                onSave={(body) => save(draft, body)}
                                onSend={() => send(draft)}
                                onDiscard={() => discard(draft)}
                            />
                        ))}
                    </section>
                </>
            )}
        </main>
    );
}

function DraftCard({ draft, busy, onSave, onSend, onDiscard }) {
    const [text, setText] = useState(draft.body);
    const pending = draft.status === 'pending';
    const dirty = text !== draft.body;

    useEffect(() => setText(draft.body), [draft.body]);

    return (
        <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">
                <div>
                    מאת: <span dir="ltr">{draft.sourceFrom}</span>
                </div>
                <div>נושא: {draft.sourceSubject || '(בלי נושא)'}</div>
                <div>טופל על ידי: {draft.agentLabel}</div>
            </div>
            <div className="text-sm">
                אל: <span dir="ltr">{draft.to}</span>
            </div>
            {draft.summary && (
                <details className="text-sm text-slate-600">
                    <summary className="cursor-pointer">סיכום הסוכן</summary>
                    <p className="whitespace-pre-line pt-2">{draft.summary}</p>
                </details>
            )}
            <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                disabled={!pending || !!busy}
                rows={10}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
            />
            <p className="text-xs text-slate-500">זו התשובה שתישלח. ערוך אותה ושמור לפני השליחה.</p>
            {draft.status === 'sent' && <p className="font-medium text-emerald-700">נשלח</p>}
            {draft.status !== 'pending' && draft.status !== 'sent' && <p className="text-slate-500">סטטוס: {draft.status}</p>}
            {draft.lastError && <p className="text-sm text-rose-700">השליחה האחרונה נכשלה: {draft.lastError}</p>}
            {pending && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => onSave(text)} disabled={!dirty || !!busy} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">
                        שמור טיוטה
                    </button>
                    <button onClick={onSend} disabled={dirty || !!busy || !text.trim()} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-white disabled:opacity-40">
                        שלח
                    </button>
                    <button onClick={onDiscard} disabled={!!busy} className="rounded-lg px-3 py-1.5 text-rose-700">
                        מחק טיוטה
                    </button>
                </div>
            )}
        </article>
    );
}
