'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (!res.ok) {
                throw new Error('Login failed');
            }

            router.push('/admin/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to login');
            setLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-ink)' }}>
            <div className="w-full max-w-md px-6 py-16">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-bone mb-2">Admin Panel</h1>
                    <p className="text-muted">Enter admin password to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-bone mb-2">Admin Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone focus:outline-none focus:border-gold"
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
                        {loading ? 'טוען...' : 'כניסה'}
                    </button>
                </form>
            </div>
        </div>
    );
}
