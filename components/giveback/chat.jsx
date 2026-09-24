'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { STATUSES } from 'lib/giveback/catalog';
import { googleMapsLink, wazeLink } from 'lib/giveback/geo';
import { api } from './api';
import { useSession } from './session';

const POLL_MS = 4000;

export function Chat({ cid }) {
    const { refresh: refreshSession } = useSession();
    const [state, setState] = useState(null);
    const [error, setError] = useState('');
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [addressOpen, setAddressOpen] = useState(false);
    const bottom = useRef(null);
    const lastCount = useRef(0);

    const load = useCallback(async () => {
        try {
            setState(await api(`/conversations/${cid}`));
            setError('');
        } catch (err) {
            setError(err.message);
        }
    }, [cid]);

    useEffect(() => {
        load().then(refreshSession);
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, [load, refreshSession]);

    const messages = state?.conversation.messages ?? [];
    useEffect(() => {
        if (messages.length !== lastCount.current) {
            lastCount.current = messages.length;
            bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages.length]);

    async function post(body) {
        setSending(true);
        setError('');
        try {
            const res = await api(`/conversations/${cid}`, { method: 'POST', body });
            setState((s) => ({ ...s, conversation: res.conversation }));
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setSending(false);
        }
    }

    async function sendText(event) {
        event.preventDefault();
        if (text.trim() && (await post({ text }))) setText('');
    }

    if (!state) return <p className="opacity-70">{error || 'טוען…'}</p>;
    const { conversation: conv, item } = state;
    const isGiver = conv.role === 'giver';

    return (
        <div className="flex flex-col gap-4">
            <header className="flex flex-wrap items-center gap-3 pb-3 border-b border-white/10">
                <Link href="/giveback/messages" className="text-sm no-underline opacity-70">
                    → כל ההודעות
                </Link>
                <div className="flex flex-col grow">
                    <h2 className="text-xl">{conv.otherName}</h2>
                    <Link href={`/giveback/item/${conv.itemId}`} className="text-sm opacity-80">
                        {conv.itemTitle}
                    </Link>
                </div>
                {item && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${STATUSES[item.status].className}`}>
                        {STATUSES[item.status].label}
                    </span>
                )}
            </header>

            <ol className="flex flex-col gap-2 min-h-64 max-h-[60vh] overflow-y-auto p-1" aria-live="polite">
                {messages.map((m) => (
                    <Message key={m.id} message={m} />
                ))}
                <li ref={bottom} />
            </ol>

            {isGiver && item?.status !== 'given' && (
                <div className="flex flex-col gap-2 p-3 border rounded-xl border-primary/40 bg-primary/5">
                    {!addressOpen ? (
                        <button className="btn" onClick={() => setAddressOpen(true)}>
                            📍 שלח כתובת לאיסוף + ניווט ב-Waze
                        </button>
                    ) : (
                        <AddressForm
                            initial={item?.address ?? ''}
                            busy={sending}
                            onCancel={() => setAddressOpen(false)}
                            onSend={async (address) => {
                                if (await post({ kind: 'address', address })) setAddressOpen(false);
                            }}
                        />
                    )}
                </div>
            )}

            <form onSubmit={sendText} className="flex gap-2">
                <input
                    className="input grow"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={isGiver ? 'מתי נוח לך לבוא?' : 'כתבו הודעה…'}
                    maxLength={1000}
                    aria-label="הודעה"
                />
                <button className="btn" disabled={sending || !text.trim()}>
                    שליחה
                </button>
            </form>
            {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
    );
}

function AddressForm({ initial, busy, onSend, onCancel }) {
    const [address, setAddress] = useState(initial);
    return (
        <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
                e.preventDefault();
                onSend(address);
            }}
        >
            <label className="text-sm font-bold" htmlFor="pickup-address">
                הכתובת שתישלח (רק לאדם הזה):
            </label>
            <input
                id="pickup-address"
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="רחוב, מספר בית, קומה / כניסה"
                maxLength={160}
            />
            <div className="flex gap-2">
                <button className="btn grow" disabled={busy || !address.trim()}>
                    שליחה
                </button>
                <button type="button" className="px-3 text-sm opacity-80" onClick={onCancel}>
                    ביטול
                </button>
            </div>
        </form>
    );
}

function Message({ message: m }) {
    if (m.kind === 'system') {
        return <li className="self-center px-3 py-1 text-xs rounded-full bg-white/10">{m.text}</li>;
    }
    const time = new Date(m.at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    // Mirrored for RTL, as in Hebrew messaging apps: your own messages sit on the left.
    const bubble = m.mine ? 'self-end bg-primary text-primary-content' : 'self-start bg-white/10';

    if (m.kind === 'address') {
        const waze = wazeLink(m);
        const google = googleMapsLink(m);
        return (
            <li className={`flex flex-col gap-2 max-w-[85%] p-3 rounded-2xl ${bubble}`}>
                <span className="font-bold">📍 כתובת לאיסוף</span>
                <span>{m.address}</span>
                <span className="flex flex-wrap gap-2">
                    <a
                        href={waze}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn no-underline"
                        style={{ background: '#33ccff', color: '#0b1f33' }}
                    >
                        🚗 נווט עם Waze
                    </a>
                    <a
                        href={google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn no-underline bg-white text-neutral-900"
                    >
                        🗺️ Google Maps
                    </a>
                </span>
                <span className="text-xs opacity-70">{time}</span>
            </li>
        );
    }

    return (
        <li className={`flex flex-col max-w-[85%] px-3 py-2 rounded-2xl whitespace-pre-wrap break-words ${bubble}`}>
            {m.text}
            <span className="text-xs opacity-60">{time}</span>
        </li>
    );
}
