'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
    { href: '/matzpen/map', label: 'מפה', icon: '🗺️' },
    { href: '/matzpen/agent', label: 'הסוכן', icon: '💬' },
    { href: '/matzpen/ranking', label: 'דירוג', icon: '🏆' },
    { href: '/matzpen/listings', label: 'דירות', icon: '🏠' },
    { href: '/matzpen/publish', label: 'פרסום דירה', icon: '➕' }
];

export function Nav() {
    const path = usePathname();
    const active = (href) => path === href || path.startsWith(`${href}/`);
    return (
        <>
            <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
                    <Link href="/matzpen" className="shrink-0 text-xl font-black text-slate-900 no-underline">
                        🧭 מצפן נדל״ן
                    </Link>
                    <nav className="hidden items-center gap-1 md:flex">
                        {LINKS.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`rounded-full px-3 py-1.5 text-sm font-bold no-underline ${
                                    active(l.href) ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>
            {/* Bottom tab bar on phones */}
            <nav className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
                {LINKS.map((l) => (
                    <Link
                        key={l.href}
                        href={l.href}
                        className={`flex flex-col items-center py-2 text-[11px] font-bold no-underline ${active(l.href) ? 'text-indigo-700' : 'text-slate-500'}`}
                    >
                        <span className="text-lg leading-none">{l.icon}</span>
                        {l.label}
                    </Link>
                ))}
            </nav>
        </>
    );
}
