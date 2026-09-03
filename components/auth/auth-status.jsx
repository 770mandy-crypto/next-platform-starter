'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function AuthStatus() {
    const { data: session, status } = useSession();

    if (status === 'loading') return null;

    if (!session?.user) {
        return (
            <Link href="/login" className="px-1.5 py-1 sm:px-3 sm:py-2">
                🔐 התחברות
            </Link>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Link href="/dashboard" className="px-1.5 py-1 sm:px-3 sm:py-2">
                👤 האזור האישי שלי
            </Link>
            <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-1.5 py-1 text-sm opacity-70 hover:opacity-100 sm:px-3 sm:py-2"
                title={session.user.email}
            >
                התנתקות
            </button>
        </div>
    );
}
