'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm({ googleEnabled }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [state, setState] = useState({ status: 'idle' });

    async function onSubmit(event) {
        event.preventDefault();
        setState({ status: 'loading' });

        const result = await signIn('credentials', { email, password, redirect: false });

        if (result?.error) {
            setState({ status: 'error', error: 'אימייל או סיסמה שגויים.' });
            return;
        }

        router.push(callbackUrl);
        router.refresh();
    }

    return (
        <div className="flex flex-col gap-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6 rounded-lg bg-white/5">
                <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">אימייל</span>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="px-4 py-3 text-white rounded bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                        dir="ltr"
                        autoComplete="email"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">סיסמה</span>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="px-4 py-3 text-white rounded bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                        dir="ltr"
                        autoComplete="current-password"
                    />
                </label>

                {state.status === 'error' && (
                    <div className="p-3 text-sm rounded bg-red-500/15 border border-red-400/40">{state.error}</div>
                )}

                <button
                    type="submit"
                    disabled={state.status === 'loading'}
                    className="px-6 py-3 font-bold rounded bg-primary text-primary-content disabled:opacity-50"
                >
                    {state.status === 'loading' ? 'מתחבר…' : 'התחברות'}
                </button>
            </form>

            {googleEnabled && (
                <>
                    <div className="flex items-center gap-3 text-sm opacity-60">
                        <div className="flex-1 border-t border-white/20" />
                        או
                        <div className="flex-1 border-t border-white/20" />
                    </div>
                    <button
                        type="button"
                        onClick={() => signIn('google', { callbackUrl })}
                        className="px-6 py-3 font-bold text-blue-900 bg-white rounded"
                    >
                        התחברות עם Google
                    </button>
                </>
            )}

            <p className="text-sm text-center opacity-70">
                אין לך חשבון?{' '}
                <Link href="/signup" className="text-primary">
                    הרשמה
                </Link>
            </p>
        </div>
    );
}
