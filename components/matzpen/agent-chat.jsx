'use client';

import MarkdownToJsx from 'markdown-to-jsx';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

const STARTERS = [
    'יש לי 1.8 מיליון ואני רוצה להשקיע. איפה כדאי?',
    'איפה כדאי לקנות 4 חדרים לגור בתקציב של 2.5 מיליון?',
    'מה השכונות הכי חזקות בחיפה?',
    'תראה לי דירות למכירה בשכונות במגמת עלייה'
];

const TOOL_STATUS = {
    search_areas: 'מחפש שכונות מתאימות...',
    get_area: 'בודק את נתוני השכונה...',
    search_listings: 'מחפש דירות למכירה...',
    web_search: 'בודק חדשות תכנון ותחבורה...'
};

export function AgentChat({ areas, onAreas, onSelect, initialQuestion, compact = false }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [mentioned, setMentioned] = useState([]);
    const [listings, setListings] = useState([]);
    const scroller = useRef(null);
    const asked = useRef(false);
    const byId = useMemo(() => Object.fromEntries(areas.map((a) => [a.id, a])), [areas]);

    const scrollDown = () => requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));

    useEffect(() => {
        if (initialQuestion && !asked.current) {
            asked.current = true;
            send(initialQuestion);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialQuestion]);

    async function send(text) {
        const message = text.trim();
        if (!message || busy) return;
        const history = messages.filter((m) => !m.error);
        setMessages([...messages, { role: 'user', content: message }, { role: 'assistant', content: '' }]);
        setInput('');
        setBusy(true);
        setStatus('חושב...');
        setMentioned([]);
        setListings([]);
        scrollDown();

        const update = (fn) =>
            setMessages((list) => {
                const copy = [...list];
                copy[copy.length - 1] = fn(copy[copy.length - 1]);
                return copy;
            });

        try {
            const res = await fetch('/api/nadlan/agent', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ message, history: history.map(({ role, content }) => ({ role, content })) })
            });
            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'משהו השתבש. נסו שוב.');
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            const seen = new Set();
            const seenListings = new Set();
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const event = JSON.parse(line);
                    if (event.type === 'text') {
                        setStatus(null);
                        update((m) => ({ ...m, content: m.content + event.text }));
                        scrollDown();
                    } else if (event.type === 'tool') {
                        setStatus(TOOL_STATUS[event.name] ?? 'בודק...');
                    } else if (event.type === 'areas') {
                        event.ids.forEach((id) => seen.add(id));
                        onAreas?.([...seen]);
                        setMentioned([...seen]);
                    } else if (event.type === 'listings') {
                        event.ids.forEach((id) => seenListings.add(id));
                        setListings([...seenListings]);
                    } else if (event.type === 'refused') {
                        update(() => ({ role: 'assistant', content: 'לא יכולתי לענות על זה. נסו לנסח אחרת.', error: true }));
                    } else if (event.type === 'error') {
                        update(() => ({ role: 'assistant', content: event.message, error: true }));
                    } else if (event.type === 'truncated') {
                        update((m) => ({ ...m, content: `${m.content}\n\n_(התשובה נקטעה)_` }));
                    }
                }
            }
        } catch (error) {
            update(() => ({ role: 'assistant', content: error.message, error: true }));
        } finally {
            setBusy(false);
            setStatus(null);
            scrollDown();
        }
    }

    const areaChip = (id) =>
        byId[id] ? (
            onSelect ? (
                <button key={id} onClick={() => onSelect(id)} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs hover:border-indigo-400">
                    📍 {byId[id].name}, {byId[id].cityName}
                </button>
            ) : (
                <Link key={id} href={`/matzpen/area/${id}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 no-underline hover:border-indigo-400">
                    📍 {byId[id].name}, {byId[id].cityName}
                </Link>
            )
        ) : null;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div ref={scroller} className={`min-h-0 flex-1 space-y-3 overflow-y-auto p-3 ${compact ? '' : 'sm:p-5'}`}>
                {messages.length === 0 && (
                    <div className="space-y-3 pt-2">
                        <p className="text-sm text-slate-600">
                            שלום! אני הסוכן של מצפן נדל״ן 🧭 ספרו לי מה התקציב, כמה חדרים ומה המטרה (לגור או להשקיע), ואמליץ איפה בארץ כדאי לקנות. אני יכול גם להראות דירות למכירה.
                        </p>
                        <div className="flex flex-col gap-2">
                            {STARTERS.map((s) => (
                                <button key={s} onClick={() => send(s)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-right text-sm text-indigo-800 hover:bg-indigo-100">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((m, i) =>
                    m.role === 'user' ? (
                        <div key={i} className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-indigo-600 px-3 py-2 text-sm text-white">
                            {m.content}
                        </div>
                    ) : m.content ? (
                        <div key={i} className={`max-w-[95%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm ${m.error ? 'bg-rose-50 text-rose-800' : 'bg-slate-100'}`}>
                            <MarkdownToJsx className="chat-md" options={{ forceBlock: true }}>
                                {m.content}
                            </MarkdownToJsx>
                        </div>
                    ) : null
                )}
                {status && <div className="animate-pulse text-xs text-slate-500">{status}</div>}
                {!busy && mentioned.length > 0 && <div className="flex flex-wrap gap-1.5">{mentioned.slice(0, 8).map(areaChip)}</div>}
                {!busy && listings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {listings.slice(0, 8).map((id) => (
                            <Link key={id} href={`/matzpen/listings/${id}`} className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 no-underline hover:border-emerald-500">
                                🏠 לדירה
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                }}
                className="flex gap-2 border-t border-slate-200 p-3"
            >
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="למשל: יש לי 2 מיליון, איפה כדאי להשקיע?"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                    שליחה
                </button>
            </form>
        </div>
    );
}
