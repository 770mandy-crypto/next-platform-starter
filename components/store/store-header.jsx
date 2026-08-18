'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCart } from 'components/store/cart-provider';

const navItems = [
    { label: 'הבית', href: '/' },
    { label: 'החנות', href: '/shop' },
    { label: 'אודות', href: '/about' },
    { label: 'צור קשר', href: '/contact' }
];

export function StoreHeader() {
    const pathname = usePathname();
    const { count, hydrated } = useCart();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-40 border-b bg-cream/90 border-espresso/10 backdrop-blur">
            <div className="flex items-center gap-4 px-6 py-4 mx-auto max-w-6xl">
                <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-expanded={menuOpen}
                    aria-label="תפריט"
                    className="p-2 -me-1 cursor-pointer sm:hidden"
                >
                    <span aria-hidden="true" className="block text-xl leading-none">
                        {menuOpen ? '✕' : '☰'}
                    </span>
                </button>

                <Link href="/" className="flex flex-col leading-none">
                    <span className="text-xl font-medium tracking-wide font-display sm:text-2xl">מאיה בוטיק</span>
                    <span className="mt-1 text-[0.6rem] tracking-[0.3em] text-mocha">SLOW FASHION</span>
                </Link>

                <nav className="hidden ms-8 sm:block">
                    <ul className="flex items-center gap-6 text-sm">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={
                                        pathname === item.href
                                            ? 'text-clay font-semibold'
                                            : 'text-mocha transition-colors hover:text-espresso'
                                    }
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <Link href="/cart" className="flex items-center gap-2 text-sm ms-auto text-espresso">
                    <span aria-hidden="true">🛍</span>
                    <span className="hidden sm:inline">עגלה</span>
                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-full bg-clay text-cream">
                        {hydrated ? count : 0}
                    </span>
                </Link>
            </div>

            {menuOpen && (
                <nav className="px-6 pb-4 border-t border-espresso/10 sm:hidden">
                    <ul className="flex flex-col gap-1 pt-2">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="block py-2 text-sm text-mocha"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </header>
    );
}
