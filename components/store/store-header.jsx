'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from 'components/store/brand-mark';
import { useCart } from 'components/store/cart-provider';

const navItems = [
    { label: 'הבית', href: '/' },
    { label: 'הקולקציה', href: '/shop' },
    { label: 'המותג', href: '/about' },
    { label: 'צור קשר', href: '/contact' }
];

export function StoreHeader() {
    const pathname = usePathname();
    const { count, hydrated } = useCart();
    const [menuOpen, setMenuOpen] = useState(false);
    // The header gives the hero its full height, then tightens once you leave it.
    const [condensed, setCondensed] = useState(false);

    useEffect(() => {
        const onScroll = () => setCondensed(window.scrollY > 40);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    // Kick the badge when a line lands in the cart, but never on first paint.
    const badgeRef = useRef(null);
    const previousCount = useRef(0);
    useEffect(() => {
        const node = badgeRef.current;
        if (node && count > previousCount.current && previousCount.current !== 0) {
            node.classList.remove('badge-pop');
            void node.offsetWidth;
            node.classList.add('badge-pop');
        }
        previousCount.current = count;
    }, [count]);

    return (
        <header
            className="sticky top-0 z-50 border-b hairline"
            style={{
                background: 'color-mix(in oklab, var(--color-ink) 88%, transparent)',
                backdropFilter: 'blur(14px)'
            }}
        >
            <div
                className="flex items-center gap-5 px-6 mx-auto max-w-7xl sm:px-10"
                style={{
                    paddingBlock: condensed ? '0.6rem' : '1.1rem',
                    transition: 'padding 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
            >
                <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-expanded={menuOpen}
                    aria-label="תפריט"
                    className="p-2 -me-2 cursor-pointer lg:hidden text-bone"
                >
                    <span aria-hidden="true" className="block text-lg leading-none">
                        {menuOpen ? '✕' : '☰'}
                    </span>
                </button>

                <Link href="/" aria-label="VALENTOS — לדף הבית" className="shrink-0">
                    <span
                        className="block origin-[right_center]"
                        style={{
                            transform: `scale(${condensed ? 0.78 : 1})`,
                            transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
                        }}
                    >
                        <BrandMark scale={0.5} variant="compact" />
                    </span>
                </Link>

                <nav className="hidden lg:block ms-10">
                    <ul className="flex items-center gap-9 text-xs tracking-[0.22em] uppercase">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="relative inline-block py-1 transition-colors"
                                    style={{ color: pathname === item.href ? 'var(--color-gold)' : 'var(--color-muted)' }}
                                >
                                    {item.label}
                                    <span
                                        aria-hidden="true"
                                        className="absolute bottom-0 h-px transition-all duration-500 start-0"
                                        style={{
                                            width: pathname === item.href ? '100%' : '0%',
                                            background: 'var(--color-gold)'
                                        }}
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <Link
                    href="/cart"
                    className="flex items-center gap-3 text-xs tracking-[0.22em] uppercase ms-auto text-bone"
                >
                    <span className="hidden sm:inline">עגלה</span>
                    <span
                        ref={badgeRef}
                        className="inline-flex items-center justify-center w-7 h-7 text-[0.7rem] font-semibold rounded-full"
                        style={{
                            background: hydrated && count ? 'var(--color-gold)' : 'transparent',
                            color: hydrated && count ? 'var(--color-ink)' : 'var(--color-muted)',
                            border: hydrated && count ? 'none' : '1px solid var(--color-hairline)',
                            transition: 'all 0.35s ease'
                        }}
                    >
                        {hydrated ? count : 0}
                    </span>
                </Link>
            </div>

            {menuOpen && (
                <nav className="px-6 pb-5 border-t hairline lg:hidden">
                    <ul className="flex flex-col pt-3">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="block py-3 text-xs tracking-[0.22em] uppercase"
                                    style={{
                                        color: pathname === item.href ? 'var(--color-gold)' : 'var(--color-muted)'
                                    }}
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
