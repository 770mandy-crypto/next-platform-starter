'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from './session';

const LINKS = [
    { href: '/giveback', label: '🔍 חיפוש', exact: true },
    { href: '/giveback/new', label: '➕ למסור חפץ' },
    { href: '/giveback/mine', label: '📦 הפריטים שלי' },
    { href: '/giveback/messages', label: '💬 הודעות', badge: true }
];

export function SubNav() {
    const pathname = usePathname();
    const { user, unread } = useSession();
    return (
        <div className="flex flex-wrap items-center gap-3 pb-6 mb-8 border-b border-white/10">
            <Link href="/giveback" className="text-2xl font-bold no-underline">
                🎁 GiveBack
            </Link>
            <nav className="flex flex-wrap gap-1 ms-auto">
                {LINKS.map((link) => {
                    const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative px-3 py-2 text-sm rounded-full no-underline transition ${
                                active ? 'bg-primary text-primary-content font-bold' : 'hover:bg-white/10'
                            }`}
                        >
                            {link.label}
                            {link.badge && unread > 0 && (
                                <span className="absolute -top-1 -start-1 min-w-5 h-5 px-1 text-xs font-bold leading-5 text-center text-white bg-red-500 rounded-full">
                                    {unread}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>
            {user && <span className="w-full text-xs text-end opacity-60">מחובר/ת בתור {user.name}</span>}
        </div>
    );
}
