'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useShop } from './providers';
import { CATEGORIES } from '../../data/catalogue';
import { useDialog } from '../../lib/shop/use-dialog';
import { IconBag, IconClose, IconGlobe, IconHeart, IconMenu, IconSearch } from './icons';

/** Rotating service line. It sits in the rail on desktop, above the bar on mobile. */
export function AnnouncementBar({ className = '' }) {
    const { t } = useShop();
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setIndex((i) => (i + 1) % t.announce.length), 4200);
        return () => clearInterval(id);
    }, [t.announce.length]);

    return (
        <p className={`relative h-8 overflow-hidden text-[0.62rem] tracking-[0.18em] uppercase text-inksoft ${className}`}>
            {t.announce.map((line, i) => (
                <span
                    key={line}
                    aria-hidden={i !== index}
                    className="absolute inset-x-0 transition-[opacity,transform] duration-500 ease-out"
                    style={{
                        opacity: i === index ? 1 : 0,
                        transitionDuration: i === index ? '600ms' : '260ms',
                        transform: `translateY(${i === index ? 0 : i < index ? -18 : 18}px)`
                    }}
                >
                    {line}
                </span>
            ))}
        </p>
    );
}

function Wordmark({ className = '' }) {
    return (
        <Link href="/" className={`block ${className}`}>
            <span className="display text-[1.7rem] tracking-[0.36em] leading-none">AYIN</span>
        </Link>
    );
}

function UtilityRow({ compact = false }) {
    const { t, lang, setLang, count, setCartOpen, wishlist } = useShop();
    const size = compact ? 'w-[22px] h-[22px]' : 'w-5 h-5';

    return (
        <div className={`flex items-center ${compact ? 'gap-1' : 'gap-4'}`}>
            <Link href="/search" aria-label={t.nav.search} className="p-2 transition-colors hover:text-brass">
                <IconSearch className={size} />
            </Link>

            <Link href="/wishlist" aria-label={t.nav.wishlist} className="relative p-2 transition-colors hover:text-brass">
                <IconHeart filled={wishlist.length > 0} className={size} />
                {wishlist.length > 0 && <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-brass" />}
            </Link>

            <button
                type="button"
                onClick={() => setCartOpen(true)}
                aria-label={t.cart.title}
                className="relative p-2 transition-colors hover:text-brass"
            >
                <IconBag className={size} />
                <span
                    key={count}
                    className={`absolute -top-0.5 ${
                        lang === 'he' ? 'start-0' : 'end-0'
                    } grid w-[17px] h-[17px] text-[0.6rem] place-items-center bg-brass text-white ticker-digit transition-transform duration-300 ${
                        count > 0 ? 'scale-100' : 'scale-0'
                    }`}
                >
                    {count}
                </span>
            </button>

            <button
                type="button"
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                aria-label="Switch language"
                className="flex items-center gap-1.5 p-2 text-[0.7rem] tracking-[0.16em] uppercase transition-colors hover:text-brass"
            >
                <IconGlobe className="w-4 h-4" />
                {lang === 'he' ? 'EN' : 'עב'}
            </button>
        </div>
    );
}

export function SiteHeader() {
    const { t, lang } = useShop();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const menuRef = useDialog(menuOpen, closeMenu);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    const categoryLinks = Object.entries(CATEGORIES).map(([key, entry]) => ({
        href: `/category/${key}`,
        label: entry.name[lang]
    }));

    const links = [
        { href: '/collection', label: t.nav.collection },
        ...categoryLinks,
        { href: '/fit', label: t.nav.fit },
        { href: '/story', label: t.nav.story },
        { href: '/service', label: t.nav.care }
    ];

    return (
        <>
            {/* Desktop: a rail that never scrolls away, so the whole shop is one
                click deep and the page beside it is free to run full bleed. */}
            <aside className="fixed inset-y-0 z-40 flex-col hidden w-64 px-8 py-8 border-e start-0 lg:flex hairline bg-bone">
                <Wordmark className="mb-12" />

                <nav className="flex flex-col gap-1 overflow-y-auto scrollbar-hidden">
                    {links.map((link) => {
                        const active = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`py-1.5 text-[0.95rem] transition-colors ${
                                    active ? 'text-ink' : 'text-inksoft hover:text-ink'
                                }`}
                            >
                                <span className={active ? 'border-b border-brass pb-0.5' : ''}>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="pt-6 mt-auto border-t hairline">
                    <UtilityRow />
                    <AnnouncementBar className="mt-4" />
                </div>
            </aside>

            {/* Mobile: a slim bar with the drawer behind it. */}
            <header className="sticky top-0 z-40 border-b lg:hidden hairline bg-bone">
                <div className="flex items-center gap-3 px-4">
                    <button type="button" onClick={() => setMenuOpen(true)} aria-label="Menu" className="p-2 -ms-2">
                        <IconMenu className="w-6 h-6" />
                    </button>
                    <Wordmark className="py-4" />
                    <div className="ms-auto">
                        <UtilityRow compact />
                    </div>
                </div>
            </header>

            <div
                className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
                    menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                inert={!menuOpen}
            >
                <button
                    type="button"
                    aria-label="Close menu"
                    onClick={closeMenu}
                    className="absolute inset-0 w-full h-full bg-black/45 backdrop-blur-sm"
                />
                <div
                    ref={menuRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="AYIN"
                    tabIndex={-1}
                    className={`absolute inset-y-0 start-0 w-[84%] max-w-sm bg-bone p-8 flex flex-col outline-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        menuOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
                    }`}
                >
                    <div className="flex items-center justify-between mb-12">
                        <Wordmark />
                        <button type="button" onClick={closeMenu} aria-label="Close">
                            <IconClose className="w-6 h-6" />
                        </button>
                    </div>
                    <nav className="flex flex-col gap-4 overflow-y-auto scrollbar-hidden">
                        {links.map((link) => (
                            <Link key={link.href} href={link.href} className="display text-2xl">
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="pt-6 mt-auto border-t hairline">
                        <AnnouncementBar />
                    </div>
                </div>
            </div>
        </>
    );
}
