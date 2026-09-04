'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useShop } from './providers';
import { useDialog } from '../../lib/shop/use-dialog';
import { IconBag, IconClose, IconGlobe, IconMenu } from './icons';

export function AnnouncementBar() {
    const { t } = useShop();
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setIndex((i) => (i + 1) % t.announce.length), 4200);
        return () => clearInterval(id);
    }, [t.announce.length]);

    return (
        <div className="relative overflow-hidden text-bone bg-ink">
            <div className="relative flex items-center justify-center h-9 text-[0.68rem] tracking-[0.2em] uppercase">
                {t.announce.map((line, i) => (
                    <span
                        key={line}
                        aria-hidden={i !== index}
                        className="absolute px-4 text-center transition-[opacity,transform] duration-500 ease-out"
                        style={{
                            opacity: i === index ? 1 : 0,
                            transitionDuration: i === index ? '600ms' : '260ms',
                            transform: `translateY(${i === index ? 0 : i < index ? -22 : 22}px)`
                        }}
                    >
                        {line}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function SiteHeader() {
    const { t, lang, setLang, count, setCartOpen } = useShop();
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const menuRef = useDialog(menuOpen, closeMenu);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    const links = [
        { href: '/collection', label: t.nav.collection },
        { href: '/story', label: t.nav.story },
        { href: '/fit', label: t.nav.fit },
        { href: '/service', label: t.nav.care }
    ];

    return (
        <>
            <AnnouncementBar />
            <header
                className={`sticky top-0 z-40 transition-all duration-500 ${
                    scrolled ? 'bg-paper/85 backdrop-blur-xl border-b hairline' : 'bg-transparent border-b border-transparent'
                }`}
            >
                <div className="flex items-center gap-6 px-5 mx-auto max-w-[1600px] sm:px-10">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        aria-label="Menu"
                        className="py-5 md:hidden -mx-1 px-1"
                    >
                        <IconMenu className="w-6 h-6" />
                    </button>

                    <Link href="/" className="py-5 shrink-0">
                        <span className="display text-[1.6rem] sm:text-[1.9rem] tracking-[0.34em] leading-none">
                            AYIN
                        </span>
                    </Link>

                    <nav className="hidden gap-8 md:flex ms-4">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`link-line py-5 text-[0.78rem] tracking-[0.16em] uppercase ${
                                    pathname === link.href ? 'link-line-active' : ''
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1 ms-auto sm:gap-3">
                        <button
                            type="button"
                            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                            className="flex items-center gap-1.5 px-2 py-2 text-[0.72rem] tracking-[0.16em] uppercase hover:text-brass transition-colors"
                            aria-label="Switch language"
                        >
                            <IconGlobe className="w-4 h-4" />
                            {lang === 'he' ? 'EN' : 'עב'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setCartOpen(true)}
                            className="relative flex items-center gap-2 px-2 py-2 hover:text-brass transition-colors"
                            aria-label={t.cart.title}
                        >
                            <IconBag className="w-6 h-6" aria-hidden="true" />
                            <span
                                key={count}
                                className={`absolute -top-0.5 ${
                                    lang === 'he' ? 'start-0' : 'end-0'
                                } grid w-[18px] h-[18px] text-[0.62rem] rounded-full place-items-center bg-ink text-bone ticker-digit transition-transform duration-300 ${
                                    count > 0 ? 'scale-100' : 'scale-0'
                                }`}
                            >
                                {count}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* mobile drawer */}
            <div
                className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
                    menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                inert={!menuOpen}
            >
                <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                    className="absolute inset-0 w-full h-full bg-ink/40 backdrop-blur-sm"
                />
                <div
                    ref={menuRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="AYIN"
                    tabIndex={-1}
                    className={`absolute inset-y-0 start-0 w-[82%] max-w-sm bg-paper p-8 flex flex-col outline-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        menuOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
                    }`}
                >
                    <div className="flex items-center justify-between mb-14">
                        <span className="display text-2xl tracking-[0.3em]">AYIN</span>
                        <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close">
                            <IconClose className="w-6 h-6" />
                        </button>
                    </div>
                    <nav className="flex flex-col gap-6">
                        {links.map((link, i) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="display text-3xl"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                    <p className="mt-auto text-sm text-inksoft">{t.brandTagline}</p>
                </div>
            </div>
        </>
    );
}
