'use client';

import { useEffect, useRef, useState } from 'react';

// A voice conversation with the agent. The browser listens (speech recognition),
// sends what was said to /api/voice, and reads the reply aloud (speech synthesis).
// The chat is kept in this browser's localStorage, so it survives a reload.

const STORAGE_KEY = 'voice-agent:chat:v1';
const LANG = 'he-IL';
const MAX_SAVED_MESSAGES = 40;

function loadChat() {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
            .slice(-MAX_SAVED_MESSAGES);
    } catch {
        return [];
    }
}

function saveChat(messages) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES)));
    } catch {
        // Storage can be full or blocked (private windows); the chat still works, it just is not kept.
    }
}

function getRecognitionClass() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function recognitionErrorText(code) {
    switch (code) {
        case 'not-allowed':
        case 'service-not-allowed':
            return 'הדפדפן לא קיבל הרשאה למיקרופון. צריך לאשר גישה למיקרופון באתר.';
        case 'audio-capture':
            return 'לא נמצא מיקרופון במכשיר.';
        case 'network':
            return 'בעיית רשת בזיהוי הדיבור. נסו שוב, או הקלידו.';
        default:
            return `זיהוי הדיבור נכשל (${code}). אפשר להקליד.`;
    }
}

export default function VoicePage() {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [listening, setListening] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [interim, setInterim] = useState('');
    const [error, setError] = useState('');
    const [needsSignIn, setNeedsSignIn] = useState(false);
    const [speakReplies, setSpeakReplies] = useState(true);
    const [conversationMode, setConversationMode] = useState(false);
    const [support, setSupport] = useState({ mic: false, speech: false, secure: true });

    // Refs hold what the async callbacks (recognition, speech end, fetch) must
    // read at the moment they fire, not at the moment they were created.
    const messagesRef = useRef([]);
    const busyRef = useRef(false);
    const speakRef = useRef(true);
    const conversationRef = useRef(false);
    const recognitionRef = useRef(null);
    const endRef = useRef(null);

    useEffect(() => {
        const saved = loadChat();
        messagesRef.current = saved;
        setMessages(saved);
        setSupport({
            mic: Boolean(getRecognitionClass()),
            speech: Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance),
            secure: window.isSecureContext
        });
        return () => {
            recognitionRef.current?.abort();
            window.speechSynthesis?.cancel();
        };
    }, []);

    useEffect(() => {
        speakRef.current = speakReplies;
        conversationRef.current = conversationMode;
    }, [speakReplies, conversationMode]);

    useEffect(() => {
        endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }, [messages, busy]);

    function commit(next) {
        messagesRef.current = next;
        setMessages(next);
        saveChat(next);
    }

    function speak(text, onEnd) {
        const synth = window.speechSynthesis;
        if (!synth || !window.SpeechSynthesisUtterance) {
            onEnd?.();
            return;
        }
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = LANG;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => {
            setSpeaking(false);
            onEnd?.();
        };
        utterance.onerror = () => setSpeaking(false);
        synth.speak(utterance);
    }

    function stopSpeaking() {
        window.speechSynthesis?.cancel();
        setSpeaking(false);
    }

    function listen() {
        const Recognition = getRecognitionClass();
        if (!Recognition) {
            setError('הדפדפן הזה לא תומך בהקלטה קולית. אפשר להקליד למטה.');
            return;
        }
        if (recognitionRef.current) return;

        stopSpeaking();
        const recognition = new Recognition();
        recognition.lang = LANG;
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        let finalText = '';
        recognition.onstart = () => {
            setListening(true);
            setError('');
        };
        recognition.onresult = (event) => {
            let pending = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const result = event.results[i];
                if (result.isFinal) finalText += result[0].transcript;
                else pending += result[0].transcript;
            }
            setInterim(pending);
        };
        recognition.onerror = (event) => {
            // "No speech" and an aborted listen are normal endings, not failures.
            if (event.error !== 'no-speech' && event.error !== 'aborted') setError(recognitionErrorText(event.error));
        };
        recognition.onend = () => {
            recognitionRef.current = null;
            setListening(false);
            setInterim('');
            const said = finalText.trim();
            if (said) send(said);
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch {
            recognitionRef.current = null;
            setListening(false);
            setError('לא הצלחתי להפעיל את המיקרופון. נסו שוב.');
        }
    }

    function stopListening() {
        recognitionRef.current?.stop();
    }

    async function send(text) {
        const message = text.trim();
        if (!message || busyRef.current) return;

        const history = messagesRef.current;
        const next = [...history, { role: 'user', content: message }];
        commit(next);
        setDraft('');
        setError('');
        setNeedsSignIn(false);
        busyRef.current = true;
        setBusy(true);

        try {
            const response = await fetch('/api/voice', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ history, message })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 401) setNeedsSignIn(true);
                throw new Error(data.error || `שגיאה ${response.status}`);
            }
            commit([...next, { role: 'assistant', content: data.reply }]);
            busyRef.current = false;
            setBusy(false);
            afterReply(data.reply);
        } catch (err) {
            // The question stays in the chat so it can be sent again.
            setError(err.message || 'השליחה נכשלה. נסו שוב.');
            busyRef.current = false;
            setBusy(false);
        }
    }

    function afterReply(reply) {
        if (speakRef.current && reply) {
            speak(reply, () => {
                if (conversationRef.current) listen();
            });
        } else if (conversationRef.current) {
            listen();
        }
    }

    function clearChat() {
        stopSpeaking();
        commit([]);
        setError('');
    }

    function onSubmit(event) {
        event.preventDefault();
        send(draft);
    }

    function toggleMic() {
        if (listening) stopListening();
        else listen();
    }

    const status = listening
        ? 'מאזין...'
        : busy
          ? 'חושב...'
          : speaking
            ? 'מדבר...'
            : 'מוכן';

    return (
        <main dir="rtl" className="flex h-dvh flex-col bg-slate-50 text-slate-900">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <h1 className="text-lg font-bold">שיחה קולית עם הסוכן</h1>
                <button
                    type="button"
                    onClick={clearChat}
                    data-testid="clear"
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                    שיחה חדשה
                </button>
            </header>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={speakReplies}
                        onChange={(e) => {
                            setSpeakReplies(e.target.checked);
                            if (!e.target.checked) stopSpeaking();
                        }}
                        data-testid="speak-toggle"
                    />
                    להקריא תשובות
                </label>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={conversationMode}
                        onChange={(e) => setConversationMode(e.target.checked)}
                        data-testid="conversation-toggle"
                    />
                    מצב שיחה (מקשיב שוב אחרי כל תשובה)
                </label>
                <span className="ms-auto font-medium text-slate-500" data-testid="status" aria-live="polite">
                    {status}
                </span>
            </div>

            {(!support.secure || !support.mic) && (
                <p className="bg-amber-50 px-4 py-2 text-sm text-amber-900" data-testid="support-note">
                    {!support.secure
                        ? 'המיקרופון עובד רק באתר מאובטח (https). בטלפון פתחו את הכתובת המלאה של האתר.'
                        : 'הדפדפן הזה לא תומך בהקלטה קולית. אפשר להקליד.'}
                </p>
            )}

            <section className="flex-1 space-y-3 overflow-y-auto px-4 py-4" data-testid="messages">
                {messages.length === 0 && (
                    <p className="text-center text-slate-500">
                        לחצו על המיקרופון ודברו, או הקלידו למטה. אפשר לשאול שאלות, לבקש חישובים או לשאול מה השעה.
                    </p>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'flex justify-start' : 'flex justify-end'}>
                        <p
                            data-testid="message"
                            data-role={m.role}
                            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 leading-relaxed ${
                                m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white ring-1 ring-slate-200'
                            }`}
                        >
                            {m.content}
                        </p>
                    </div>
                ))}
                {interim && <p className="text-end text-slate-400 italic">{interim}</p>}
                {busy && <p className="text-end text-slate-400">חושב...</p>}
                <div ref={endRef} />
            </section>

            {error && (
                <div role="alert" className="mx-4 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid="error">
                    {error}
                    {needsSignIn && (
                        <>
                            {' '}
                            <a href="/pilot" className="font-semibold underline">
                                להתחברות
                            </a>
                        </>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
                <button
                    type="button"
                    onClick={toggleMic}
                    disabled={!support.mic || busy}
                    data-testid="mic"
                    aria-pressed={listening}
                    aria-label={listening ? 'עצור הקלטה' : 'התחל הקלטה'}
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl text-white shadow disabled:opacity-40 ${
                        listening ? 'animate-pulse bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    🎤
                </button>
                <form onSubmit={onSubmit} className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="או הקלידו כאן"
                        data-testid="message-input"
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={busy || !draft.trim()}
                        data-testid="send"
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-white disabled:opacity-40"
                    >
                        שלח
                    </button>
                </form>
                {speaking && (
                    <button type="button" onClick={stopSpeaking} data-testid="stop-speaking" className="rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-100">
                        השתק
                    </button>
                )}
            </div>
        </main>
    );
}
