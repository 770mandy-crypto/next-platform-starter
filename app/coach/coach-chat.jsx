'use client';

import { useState, useRef, useEffect } from 'react';
import { videoSearchUrl } from '../../data/workouts.js';

const SUGGESTIONS = [
    'אימון כוח לרגליים למתחילים',
    'אירובי לשריפת קלוריות, 15 דקות',
    'תרגילים לבטן וליבה',
    'מתיחות לגב תפוס'
];

const WELCOME = {
    role: 'coach',
    text: 'שלום וברוכים הבאים למאמן הכושר האישי! 👋 ספרו לי מה המטרה שלכם היום ואבנה לכם תוכנית אימון מותאמת. לדוגמה: "אני רוצה לחזק רגליים ב-20 דקות".'
};

export function CoachChat() {
    const [messages, setMessages] = useState([WELCOME]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading]);

    async function send(text) {
        const trimmed = (text ?? input).trim();
        if (!trimmed || loading) return;

        setMessages((m) => [...m, { role: 'user', text: trimmed }]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed })
            });
            const data = await res.json();
            setMessages((m) => [...m, { role: 'coach', text: data.reply, plan: data.plan }]);
        } catch {
            setMessages((m) => [
                ...m,
                { role: 'coach', text: 'אופס, משהו השתבש. נסו שוב עוד רגע. 🙏' }
            ]);
        } finally {
            setLoading(false);
        }
    }

    function onSubmit(e) {
        e.preventDefault();
        send();
    }

    return (
        <div className="flex flex-col overflow-hidden bg-white border rounded-lg shadow-lg border-neutral-200 text-neutral-800">
            <div className="flex items-center gap-3 px-5 py-4 text-white bg-secondary">
                <span className="text-2xl">🏋️</span>
                <div>
                    <div className="font-bold">המאמן האישי</div>
                    <div className="text-xs opacity-80">מוכן לבנות לכם אימון</div>
                </div>
            </div>

            <div ref={scrollRef} className="flex flex-col gap-4 p-5 overflow-y-auto h-96 bg-neutral-50">
                {messages.map((msg, i) => (
                    <Message key={i} msg={msg} />
                ))}
                {loading && (
                    <div className="self-start px-4 py-3 text-sm rounded-2xl rounded-bl-sm bg-neutral-200 text-neutral-500">
                        המאמן חושב...
                    </div>
                )}
            </div>

            {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 px-5 pb-3 bg-neutral-50">
                    {SUGGESTIONS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => send(s)}
                            className="px-3 py-1.5 text-xs transition border rounded-full border-secondary/40 text-secondary hover:bg-secondary hover:text-white"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={onSubmit} className="flex gap-2 p-4 border-t border-neutral-200">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="כתבו את המטרה שלכם..."
                    className="flex-1 px-4 py-3 text-sm border rounded-full border-neutral-300 text-neutral-900 focus:border-primary focus:outline-2 focus:outline-primary/40"
                />
                <button type="submit" disabled={loading || !input.trim()} className="btn rounded-full px-5">
                    שליחה
                </button>
            </form>
        </div>
    );
}

function Message({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={isUser ? 'self-end max-w-[85%]' : 'self-start max-w-[92%]'}>
            <div
                className={[
                    'px-4 py-3 text-sm leading-relaxed rounded-2xl',
                    isUser
                        ? 'bg-secondary text-white rounded-br-sm'
                        : 'bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm'
                ].join(' ')}
            >
                {msg.text}
            </div>
            {msg.plan && <PlanCard plan={msg.plan} />}
        </div>
    );
}

function PlanCard({ plan }) {
    return (
        <div className="mt-3 space-y-3">
            {plan.exercises.map((ex, i) => (
                <div key={ex.id} className="p-4 bg-white border rounded-lg border-neutral-200">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-neutral-900">
                            {i + 1}. {ex.name}
                        </h4>
                        <a
                            href={videoSearchUrl(ex.youtubeQuery)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-semibold text-secondary whitespace-nowrap"
                        >
                            ▶ צפו בהדגמה
                        </a>
                    </div>
                    <div className="mb-2 text-xs font-semibold text-primary-content bg-primary inline-block px-2 py-0.5 rounded">
                        {ex.prescription}
                    </div>
                    <ol className="pr-4 space-y-1 text-sm list-decimal text-neutral-600">
                        {ex.steps.map((step, j) => (
                            <li key={j}>{step}</li>
                        ))}
                    </ol>
                    {ex.tips && <p className="mt-2 text-xs text-neutral-500">💡 {ex.tips}</p>}
                </div>
            ))}
        </div>
    );
}
