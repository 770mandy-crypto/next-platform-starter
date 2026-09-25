'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from 'components/auth-provider';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await login(email, password);
        if (success) {
            router.push('/dashboard');
        } else {
            setError('התחברות נכשלה. בדוק את הדוא"ל והסיסמה.');
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-center">התחבר ל-FixNow</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">דוא"ל</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">סיסמה</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition"
                    >
                        {loading ? 'מתחבר...' : 'התחבר'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-white/70">
                    אין לך חשבון?{' '}
                    <Link href="/register" className="text-blue-400 hover:text-blue-300">
                        הירשם כאן
                    </Link>
                </div>
            </div>
        </div>
    );
}
