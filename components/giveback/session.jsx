'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';

const SessionContext = createContext(null);

export function useSession() {
    return useContext(SessionContext);
}

// Holds who the visitor is and their unread count, and offers requireUser():
// any action that needs an identity awaits it, and a first-time visitor is
// asked for a display name inline instead of being sent to a sign-up page.
export function SessionProvider({ children }) {
    const [user, setUser] = useState(undefined);
    const [unread, setUnread] = useState(0);
    const [prompt, setPrompt] = useState(null);

    const refresh = useCallback(async () => {
        try {
            const me = await api('/me');
            setUser(me.user);
            setUnread(me.unread);
        } catch {
            setUser((u) => u ?? null);
        }
    }, []);

    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, 20000);
        return () => clearInterval(timer);
    }, [refresh]);

    const requireUser = useCallback(() => {
        if (user) return Promise.resolve(user);
        return new Promise((resolve, reject) => setPrompt({ resolve, reject }));
    }, [user]);

    const onNamed = (named) => {
        setUser(named);
        prompt?.resolve(named);
        setPrompt(null);
    };
    const onCancel = () => {
        prompt?.reject(new Error('cancelled'));
        setPrompt(null);
    };

    return (
        <SessionContext.Provider value={{ user, unread, refresh, requireUser, setUnread }}>
            {children}
            {prompt && <NameDialog onDone={onNamed} onCancel={onCancel} />}
        </SessionContext.Provider>
    );
}

function NameDialog({ onDone, onCancel }) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const input = useRef(null);

    useEffect(() => input.current?.focus(), []);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const { user } = await api('/me', { method: 'POST', body: { name } });
            onDone(user);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <form
                onSubmit={submit}
                className="flex flex-col w-full max-w-sm gap-4 p-6 text-white rounded-xl bg-blue-950 border border-white/15"
            >
                <h3>איך לקרוא לך?</h3>
                <p className="text-sm opacity-80">
                    השם יוצג לשכנים שתתכתבו איתם. אין צורך בסיסמה — החשבון נשמר בדפדפן הזה.
                </p>
                <input
                    ref={input}
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="למשל: דנה מהקומה השלישית"
                    maxLength={30}
                />
                {error && <p className="text-sm text-red-300">{error}</p>}
                <div className="flex gap-2">
                    <button className="btn grow" disabled={busy || name.trim().length < 2}>
                        המשך
                    </button>
                    <button type="button" className="px-4 text-sm opacity-80 hover:opacity-100" onClick={onCancel}>
                        ביטול
                    </button>
                </div>
            </form>
        </div>
    );
}
