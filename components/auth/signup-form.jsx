'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SignupForm({ googleEnabled }) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [state, setState] = useState({ status: 'idle' });

    async function onSubmit(event) {
        event.preventDefault();
        setState({ status: 'loading' });

        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const payload = await response.json();

        if (!response.ok) {
            setState({ status: 'error', error: payload.error || 'ההרשמה נכשלה.' });
            return;
        }

        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.error) {
            setState({ status: 'error', error: 'החשבון נוצר, אבל ההתחברות נכשלה — נסה להתחבר ידנית.' });
            return;
        }

        router.push('/dashboard');
        router.refresh();
    }

    return (
        <div className="flex flex-col gap-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6 rounded-lg bg-white/5">
                <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">שם (רשות)</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="px-4 py-3 text-white rounded bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                        autoComplete="name"
                    />
                </label>
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
                    <span className="text-sm font-semibold">סיסמה (8 תווים לפחות)</span>
                    <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="px-4 py-3 text-white rounded bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
                        dir="ltr"
                        autoComplete="new-password"
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
                    {state.status === 'loading' ? 'נרשם…' : 'הרשמה'}
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
                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                        className="px-6 py-3 font-bold text-blue-900 bg-white rounded"
                    >
                        הרשמה עם Google
                    </button>
                </>
            )}

            <p className="text-sm text-center opacity-70">
                כבר יש לך חשבון?{' '}
                <Link href="/login" className="text-primary">
                    התחברות
                </Link>
            </p>
        </div>
    );
}
