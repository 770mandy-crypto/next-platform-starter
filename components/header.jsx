'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from 'components/logo';

const navItems = [
    { linkText: 'תוכניות', href: '#programs' },
    { linkText: 'איך זה עובד', href: '#how' },
    { linkText: 'תוצאות', href: '#results' },
    { linkText: 'המלצות', href: '#testimonials' },
    { linkText: 'מחירים', href: '#pricing' },
    { linkText: 'שאלות נפוצות', href: '#faq' }
];

export function Header() {
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 pt-4 sm:pt-6">
            <nav className="flex items-center gap-4 px-4 py-3 border shadow-lg bg-neutral-950/80 backdrop-blur-md border-edge rounded-2xl sm:px-6 shadow-black/30">
                <Link href="#top" className="text-white no-underline">
                    <Logo />
                </Link>

                <ul className="hidden gap-1 mr-2 lg:flex">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className="px-3 py-2 text-sm font-medium no-underline transition rounded-lg text-neutral-300 hover:text-white hover:bg-white/5"
                            >
                                {item.linkText}
                            </Link>
                        </li>
                    ))}
                </ul>

                <Link href="#pricing" className="hidden btn mr-auto lg:inline-flex">
                    התחילו עכשיו
                </Link>

                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-label="תפריט ניווט"
                    className="flex items-center justify-center w-10 h-10 mr-auto border rounded-lg lg:hidden border-edge"
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                        {open ? (
                            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                        ) : (
                            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                        )}
                    </svg>
                </button>
            </nav>

            {open && (
                <div className="p-4 mt-2 border shadow-lg bg-neutral-950/95 backdrop-blur-md border-edge rounded-2xl lg:hidden">
                    <ul className="flex flex-col gap-1">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className="block px-3 py-2.5 font-medium no-underline rounded-lg text-neutral-200 hover:bg-white/5"
                                >
                                    {item.linkText}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <Link href="#pricing" onClick={() => setOpen(false)} className="w-full mt-3 btn">
                        התחילו עכשיו
                    </Link>
                </div>
            )}
        </header>
    );
}
