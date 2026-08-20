'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleSignUp(e) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('הסיסמאות לא תואמות');
            return;
        }

        if (password.length < 6) {
            setError('הסיסמה חייבת להיות לפחות 6 תווים');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            if (!res.ok) {
                throw new Error('Sign up failed');
            }

            router.push('/account/orders');
        } catch (err) {
            setError(err.message || 'Failed to sign up');
            setLoading(false);
        }
    }

    return (
        <div className="px-6 py-16 mx-auto max-w-md sm:px-10 sm:py-24">
            <h1 className="text-3xl font-bold mb-8">הרשמה חדשה</h1>

            <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">שם מלא</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                        placeholder="שמך"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">דואר אלקטרוני</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                        placeholder="example@email.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">סיסמה</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">אישור סיסמה</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-900 text-red-100 rounded text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold text-ink py-3 font-semibold rounded hover:opacity-90 disabled:opacity-50"
                >
                    {loading ? 'יוצר חשבון...' : 'הרשמה'}
                </button>
            </form>

            <div className="mt-8 pt-8 border-t border-hairline text-center">
                <p className="text-muted mb-4">כבר יש לך חשבון?</p>
                <Link href="/auth/signin" className="text-gold hover:underline">
                    כניסה
                </Link>
            </div>
        </div>
    );
}
