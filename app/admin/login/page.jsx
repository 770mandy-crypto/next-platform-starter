'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'components/card';
import { Alert } from 'components/alert';

export const dynamic = 'force-static';

export default function AdminLogin() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError('');

        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        setSubmitting(false);

        if (!res.ok) {
            const { error: message } = await res.json().catch(() => ({}));
            setError(message || 'סיסמה שגויה');
            return;
        }

        router.push('/admin');
        router.refresh();
    };

    return (
        <div className="max-w-sm mx-auto mt-16" dir="rtl">
            <Card title="כניסת מנהל">
                {error && <Alert type="error">{error}</Alert>}
                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm">סיסמה</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoFocus
                            required
                            className="border rounded-sm px-3 py-2 text-neutral-900"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-primary text-primary-content rounded-sm px-4 py-2 disabled:opacity-50"
                    >
                        {submitting ? 'בודק…' : 'התחבר'}
                    </button>
                </form>
            </Card>
        </div>
    );
}
