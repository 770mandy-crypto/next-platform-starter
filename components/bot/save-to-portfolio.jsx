'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function SaveToPortfolio({ symbol }) {
    const { data: session, status } = useSession();
    const [state, setState] = useState({ status: 'idle' });

    if (status === 'loading') return null;

    if (!session?.user) {
        return (
            <Link href="/login" className="text-sm underline opacity-70 hover:opacity-100">
                התחבר כדי לשמור לרשימה שלך
            </Link>
        );
    }

    async function onSave() {
        setState({ status: 'loading' });
        const response = await fetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
        });
        const payload = await response.json();
        if (!response.ok) {
            setState({ status: 'error', error: payload.error });
            return;
        }
        setState({ status: 'saved' });
    }

    if (state.status === 'saved') {
        return <span className="text-sm text-green-400">✓ נשמר באזור האישי שלך</span>;
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={onSave}
                disabled={state.status === 'loading'}
                className="px-4 py-2 text-sm font-bold rounded bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
                {state.status === 'loading' ? 'שומר…' : '⭐ הוסף לרשימה שלי'}
            </button>
            {state.status === 'error' && <span className="text-xs text-red-400">{state.error}</span>}
        </div>
    );
}
