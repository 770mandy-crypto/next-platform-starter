'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, timeAgo } from './api';
import { useSession } from './session';

export function Inbox() {
    const { user, requireUser } = useSession();
    const [conversations, setConversations] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const load = () =>
            api('/conversations')
                .then((r) => !cancelled && setConversations(r.conversations))
                .catch((e) => !cancelled && setError(e.message));
        load();
        const timer = setInterval(load, 10000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [user]);

    if (user === undefined) return <p className="opacity-70">טוען…</p>;
    if (!user) {
        return (
            <div className="flex flex-col items-start gap-3">
                <p>כדי לראות הודעות צריך קודם לבחור שם.</p>
                <button className="btn" onClick={() => requireUser().catch(() => {})}>
                    בחירת שם
                </button>
            </div>
        );
    }
    if (error) return <p className="text-red-300">{error}</p>;
    if (!conversations) return <p className="opacity-70">טוען…</p>;
    if (conversations.length === 0) {
        return (
            <p className="opacity-70">
                אין עדיין שיחות. <Link href="/giveback">מצאו משהו</Link> או{' '}
                <Link href="/giveback/new">פרסמו משהו למסירה</Link>.
            </p>
        );
    }

    return (
        <ul className="flex flex-col divide-y divide-white/10 border rounded-xl border-white/10 bg-white/5">
            {conversations.map((c) => (
                <li key={c.id}>
                    <Link
                        href={`/giveback/messages/${c.id}`}
                        className="flex items-center gap-3 p-4 no-underline hover:bg-white/5"
                    >
                        <span className="text-2xl" aria-hidden="true">
                            {c.role === 'giver' ? '🎁' : '🙋'}
                        </span>
                        <span className="flex flex-col min-w-0 grow">
                            <span className="font-bold">
                                {c.otherName} · <span className="font-normal opacity-80">{c.itemTitle}</span>
                            </span>
                            <span className="text-sm truncate opacity-70">{c.lastText}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1 text-xs shrink-0">
                            <span className="opacity-60">{timeAgo(c.updatedAt)}</span>
                            {c.unread > 0 && (
                                <span className="px-2 font-bold text-white bg-red-500 rounded-full">{c.unread}</span>
                            )}
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
