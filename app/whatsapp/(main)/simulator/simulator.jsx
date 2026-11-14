'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 4000;
const EXAMPLES = ['מה מזג האוויר מחר בתל אביב?', 'תזכיר לי בעוד 2 דקות לשתות מים', 'תוסיף חלב וביצים לקניות', 'תכין לי מצגת קצרה על חיסכון לפנסיה'];

// WhatsApp formatting (*bold*, _italic_) and bare links, rendered safely.
function Formatted({ text }) {
    const parts = text.split(/(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_)/g);
    return parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
            return (
                <a key={i} href={part} target="_blank" rel="noreferrer" dir="ltr" className="break-all text-sky-700 underline">
                    {part}
                </a>
            );
        }
        if (/^\*[^*]+\*$/.test(part)) return <b key={i}>{part.slice(1, -1)}</b>;
        if (/^_[^_]+_$/.test(part)) return <i key={i}>{part.slice(1, -1)}</i>;
        return <span key={i}>{part}</span>;
    });
}

export function Simulator() {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState(null);
    const cursor = useRef('');
    const loaded = useRef(false);
    const bottom = useRef(null);

    const poll = useCallback(async () => {
        const response = await fetch(`/api/whatsapp/simulator?since=${encodeURIComponent(cursor.current)}`);
        if (!response.ok) return;
        const { messages: fresh } = await response.json();
        // The person's own messages are already on screen, except on the first
        // load, which rebuilds the chat after a reload.
        const firstLoad = !loaded.current;
        loaded.current = true;
        if (!fresh.length) return;
        cursor.current = fresh.at(-1).key;
        const shown = fresh.filter((m) => firstLoad || !m.me).map((m) => ({ id: m.key, me: Boolean(m.me), text: m.text }));
        setMessages((current) => [...current, ...shown]);
    }, []);

    useEffect(() => {
        poll();
        const timer = setInterval(poll, POLL_MS);
        return () => clearInterval(timer);
    }, [poll]);

    useEffect(() => {
        bottom.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, waiting]);

    async function send(text) {
        const clean = text.trim();
        if (!clean || waiting) return;
        setDraft('');
        setError(null);
        setMessages((current) => [...current, { id: `me-${Date.now()}`, me: true, text: clean }]);
        setWaiting(true);
        try {
            const response = await fetch('/api/whatsapp/simulator', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ text: clean })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'משהו השתבש.');
            await poll();
        } catch (err) {
            setError(err.message);
        } finally {
            setWaiting(false);
        }
    }

    async function reset() {
        await fetch('/api/whatsapp/simulator', { method: 'DELETE' });
        cursor.current = '';
        loaded.current = true;
        setMessages([]);
    }

    return (
        <main className="mx-auto flex h-[calc(100dvh-57px)] max-w-lg flex-col">
            <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
                <div className="grid size-10 place-items-center rounded-full bg-white/20 text-xl">🤖</div>
                <div className="flex-1">
                    <div className="font-bold">העוזר שלי</div>
                    <div className="text-xs text-white/70">{waiting ? 'מקליד…' : 'סימולטור: אותו עוזר, בלי וואטסאפ'}</div>
                </div>
                <button type="button" onClick={reset} className="text-xs text-white/80 underline">
                    שיחה חדשה
                </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-[#e5ddd5] p-3 text-[15px]">
                {messages.length === 0 && (
                    <div className="space-y-2 pt-6 text-center">
                        <p className="text-sm text-slate-600">אפשר להתחיל ב"היי", או לנסות:</p>
                        {EXAMPLES.map((example) => (
                            <button
                                key={example}
                                type="button"
                                onClick={() => send(example)}
                                className="mx-auto block rounded-full bg-white px-4 py-2 text-sm shadow-sm"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                )}
                {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.me ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 shadow-sm ${m.me ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                            <Formatted text={m.text} />
                        </div>
                    </div>
                ))}
                {error && <p className="text-center text-sm font-bold text-rose-700">{error}</p>}
                <div ref={bottom} />
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send(draft);
                }}
                className="flex gap-2 bg-[#f0f0f0] p-2"
            >
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="הקלדת הודעה"
                    className="flex-1 rounded-full border-0 bg-white px-4 py-2"
                />
                <button type="submit" disabled={!draft.trim() || waiting} className="rounded-full bg-[#00a884] px-4 font-bold text-white disabled:opacity-40">
                    שליחה
                </button>
            </form>
        </main>
    );
}
