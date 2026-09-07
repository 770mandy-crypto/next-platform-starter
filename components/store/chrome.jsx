'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CATEGORIES, getProduct } from '../../data/catalogue';
import { useStore } from '../../lib/store/context';
import { useDialog } from '../../lib/store/use-dialog';
import { IconArrow, IconBag, IconClose, IconGlobe, IconHeart, IconMenu, IconMinus, IconPlus, IconSearch } from './icons';

/* ------------------------------------------------------------------ header */

export function SiteHeader() {
    const { t, lang, setLang, count, setBagOpen, saved } = useStore();
    const pathname = usePathname();
    const [compact, setCompact] = useState(false);
    const [menu, setMenu] = useState(false);
    const [mega, setMega] = useState(false);
    const closeMenu = useCallback(() => setMenu(false), []);
    const menuRef = useDialog(menu, closeMenu);

    useEffect(() => {
        const onScroll = () => setCompact(window.scrollY > 20);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMenu(false);
        setMega(false);
    }, [pathname]);

    const categories = Object.entries(CATEGORIES);

    return (
        <>
            {/* the service line every clothing shop puts above the logo */}
            <div className="text-center bg-ink text-canvas">
                <p className="py-2 text-[0.66rem] tracking-[0.16em] uppercase">{t.service[0]}</p>
            </div>

            <header
                className={`sticky top-0 z-40 border-b rule bg-canvas/95 backdrop-blur transition-[padding] duration-300 ${
                    compact ? 'py-1' : 'py-3'
                }`}
                onMouseLeave={() => setMega(false)}
            >
                <div className="flex items-center gap-4 px-5 mx-auto max-w-[1500px] sm:px-8">
                    <button
                        type="button"
                        onClick={() => setMenu(true)}
                        aria-label={t.nav.menu}
                        className="p-2 -ms-2 lg:hidden"
                    >
                        <IconMenu className="w-6 h-6" />
                    </button>

                    <nav className="hidden gap-7 lg:flex">
                        <button
                            type="button"
                            onMouseEnter={() => setMega(true)}
                            onFocus={() => setMega(true)}
                            onClick={() => setMega((open) => !open)}
                            aria-expanded={mega}
                            className={`label text-ink ul-hover ${mega ? 'ul-on' : ''}`}
                        >
                            {t.nav.shop}
                        </button>
                        <Link href="/shop?sort=new" className="label text-ink ul-hover">
                            {t.nav.new}
                        </Link>
                        <Link href="/about" className={`label text-ink ul-hover ${pathname === '/about' ? 'ul-on' : ''}`}>
                            {t.nav.about}
                        </Link>
                        <Link href="/help" className={`label text-ink ul-hover ${pathname === '/help' ? 'ul-on' : ''}`}>
                            {t.nav.help}
                        </Link>
                    </nav>

                    {/* centred over the bar on desktop; in the flow on a phone,
                        where absolute centring would sit under the icons */}
                    <Link href="/" aria-label="MAOR" className="mx-auto lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                        <span
                            className={`block font-serif tracking-[0.4em] leading-none transition-all duration-300 ${
                                compact ? 'text-[1.25rem]' : 'text-[1.6rem]'
                            }`}
                        >
                            MAOR
                        </span>
                    </Link>

                    <div className="flex items-center gap-1 ms-auto sm:gap-2">
                        <Link href="/search" aria-label={t.nav.search} className="p-2 hover:text-clay">
                            <IconSearch className="w-5 h-5" />
                        </Link>
                        <Link href="/saved" aria-label={t.nav.saved} className="relative hidden p-2 sm:block hover:text-clay">
                            <IconHeart filled={saved.length > 0} className="w-5 h-5" />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                            aria-label="Switch language"
                            className="flex items-center gap-1 p-2 text-[0.68rem] tracking-[0.14em] uppercase hover:text-clay"
                        >
                            <IconGlobe className="w-4 h-4" />
                            {lang === 'he' ? 'EN' : 'עב'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setBagOpen(true)}
                            aria-label={t.nav.bag}
                            className="relative p-2 hover:text-clay"
                        >
                            <IconBag className="w-5 h-5" />
                            {count > 0 && (
                                <span className="absolute top-0.5 end-0.5 grid w-4 h-4 text-[0.58rem] rounded-full place-items-center bg-ink text-canvas ticker">
                                    {count}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* mega menu: categories on one side, a picture on the other */}
                <div
                    className={`hidden lg:block overflow-hidden border-t rule transition-[max-height,opacity] duration-300 ${
                        mega ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="grid gap-10 px-8 py-8 mx-auto max-w-[1500px] grid-cols-[1fr_auto]">
                        <ul className="grid grid-cols-3 gap-x-10 gap-y-3">
                            <li className="col-span-3 mb-1 label">{t.nav.shop}</li>
                            <li>
                                <Link href="/shop" className="text-sm ul-hover">
                                    {t.listing.all}
                                </Link>
                            </li>
                            {categories.map(([key, entry]) => (
                                <li key={key}>
                                    <Link href={`/c/${key}`} className="text-sm ul-hover">
                                        {entry.name[lang]}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link href="/c/eyewear" className="relative block w-64 overflow-hidden aspect-[4/3] bg-card">
                            <Image src="/shop/sunglasses-black.jpg" alt="" fill sizes="256px" className="object-cover" />
                            <span className="absolute bottom-3 start-3 bg-card px-3 py-1 text-[0.62rem] tracking-[0.16em] uppercase">
                                {CATEGORIES.eyewear.name[lang]}
                            </span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* mobile drawer */}
            <div
                className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
                    menu ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                inert={!menu}
            >
                <button
                    type="button"
                    aria-label={t.nav.close}
                    onClick={closeMenu}
                    className="absolute inset-0 w-full h-full bg-black/40"
                />
                <div
                    ref={menuRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="MAOR"
                    tabIndex={-1}
                    className={`absolute inset-y-0 start-0 w-[86%] max-w-sm bg-canvas p-7 flex flex-col outline-none transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        menu ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
                    }`}
                >
                    <div className="flex items-center justify-between mb-10">
                        <span className="font-serif text-xl tracking-[0.36em]">MAOR</span>
                        <button type="button" onClick={closeMenu} aria-label={t.nav.close}>
                            <IconClose className="w-6 h-6" />
                        </button>
                    </div>
                    <nav className="flex flex-col gap-4 overflow-y-auto">
                        <Link href="/shop" className="text-2xl font-serif">
                            {t.listing.all}
                        </Link>
                        {categories.map(([key, entry]) => (
                            <Link key={key} href={`/c/${key}`} className="text-2xl font-serif">
                                {entry.name[lang]}
                            </Link>
                        ))}
                        <span className="my-2 border-t rule" />
                        <Link href="/saved" className="text-sm">
                            {t.nav.saved}
                        </Link>
                        <Link href="/about" className="text-sm">
                            {t.nav.about}
                        </Link>
                        <Link href="/help" className="text-sm">
                            {t.nav.help}
                        </Link>
                    </nav>
                    <p className="mt-auto text-xs text-mute">{t.tagline}</p>
                </div>
            </div>
        </>
    );
}

/* -------------------------------------------------------------- service bar */

export function ServiceBar() {
    const { t } = useStore();
    const items = [...t.service, ...t.service];
    return (
        <div className="py-4 overflow-hidden border-y rule bg-card">
            <div className="marquee-row">
                {items.map((line, index) => (
                    <span
                        key={`${line}-${index}`}
                        className="flex items-center gap-6 px-6 text-[0.66rem] tracking-[0.18em] uppercase whitespace-nowrap text-mute"
                    >
                        {line}
                        <span className="w-1 h-1 rounded-full bg-clay" />
                    </span>
                ))}
            </div>
        </div>
    );
}

/* --------------------------------------------------------------- newsletter */

export function Newsletter() {
    const { t } = useStore();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    return (
        <section className="px-5 py-20 border-t rule sm:px-8 bg-card">
            <div className="max-w-xl mx-auto text-center">
                <h2 className="mb-3">{t.news.title}</h2>
                <p className="mb-8 text-sm text-mute">{t.news.body}</p>
                {sent ? (
                    <p className="text-sm">{t.news.done}</p>
                ) : (
                    <form
                        className="flex flex-col gap-3 sm:flex-row"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (email.includes('@')) setSent(true);
                        }}
                    >
                        <label className="sr-only" htmlFor="news-email">
                            {t.news.placeholder}
                        </label>
                        <input
                            id="news-email"
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder={t.news.placeholder}
                            className="flex-1 px-4 py-3 text-sm bg-transparent border rule focus:outline-none focus:border-ink"
                        />
                        <button type="submit" className="btn">
                            {t.news.cta}
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------- footer */

export function SiteFooter() {
    const { t, lang } = useStore();
    const columns = [
        {
            title: t.footer.shop,
            links: [
                { label: t.listing.all, href: '/shop' },
                ...Object.entries(CATEGORIES).map(([key, entry]) => ({ label: entry.name[lang], href: `/c/${key}` }))
            ]
        },
        {
            title: t.footer.brand,
            links: [
                { label: t.nav.about, href: '/about' },
                { label: t.nav.saved, href: '/saved' },
                { label: t.nav.search, href: '/search' }
            ]
        },
        {
            title: t.footer.care,
            links: [
                { label: t.help.groups[0].t, href: '/help' },
                { label: t.help.groups[1].t, href: '/help' },
                { label: t.help.groups[2].t, href: '/help' }
            ]
        }
    ];

    return (
        <footer className="px-5 pt-16 pb-10 border-t rule sm:px-8">
            <div className="mx-auto max-w-[1500px] grid gap-10 md:grid-cols-[1.3fr_repeat(3,1fr)]">
                <div>
                    <p className="mb-3 font-serif text-2xl tracking-[0.36em]">MAOR</p>
                    <p className="max-w-xs text-sm text-mute">{t.tagline}</p>
                </div>
                {columns.map((column) => (
                    <div key={column.title}>
                        <p className="mb-4 label">{column.title}</p>
                        <ul className="space-y-2.5">
                            {column.links.map((link) => (
                                <li key={`${column.title}-${link.label}`}>
                                    <Link href={link.href} className="text-sm ul-hover text-mute hover:text-ink">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="mx-auto max-w-[1500px] mt-14 pt-6 border-t rule flex flex-col gap-2 text-xs text-mute sm:flex-row sm:justify-between">
                <p>
                    © {new Date().getFullYear()} MAOR. {t.footer.rights}.
                </p>
                <p>{t.footer.demo}</p>
            </div>
        </footer>
    );
}

/* --------------------------------------------------------------- bag drawer */

function QtyStepper({ value, onChange }) {
    return (
        <div className="inline-flex items-center border rule">
            <button type="button" onClick={() => onChange(value - 1)} aria-label="-" className="p-2">
                <IconMinus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-sm text-center ticker">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} aria-label="+" className="p-2">
                <IconPlus className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export function BagDrawer() {
    const {
        t,
        lang,
        price,
        lines,
        subtotal,
        discount,
        shipping,
        total,
        promo,
        applyPromo,
        setQty,
        removeLine,
        bagOpen,
        setBagOpen,
        freeShippingLeft,
        freeShippingProgress
    } = useStore();
    const close = useCallback(() => setBagOpen(false), [setBagOpen]);
    const ref = useDialog(bagOpen, close);
    const [code, setCode] = useState('');
    const [bad, setBad] = useState(false);

    return (
        <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${
                bagOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            inert={!bagOpen}
        >
            <button type="button" aria-label={t.nav.close} onClick={close} className="absolute inset-0 w-full h-full bg-black/40" />
            <aside
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-label={t.bag.title}
                tabIndex={-1}
                className={`absolute inset-y-0 end-0 w-full sm:w-[430px] bg-canvas flex flex-col outline-none transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    bagOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
                }`}
            >
                <header className="flex items-center justify-between px-6 py-5 border-b rule">
                    <h2 className="text-lg">{t.bag.title}</h2>
                    <button type="button" onClick={close} aria-label={t.nav.close}>
                        <IconClose className="w-5 h-5" />
                    </button>
                </header>

                {lines.length > 0 && (
                    <div className="px-6 py-3 border-b rule bg-card">
                        <p className="mb-2 text-[0.68rem] tracking-[0.14em] uppercase text-mute">
                            {freeShippingLeft > 0 ? t.bag.toFree(price(freeShippingLeft)) : t.bag.gotFree}
                        </p>
                        <span className="block h-[2px] bg-rule">
                            <span
                                className="block h-full transition-all duration-500 bg-clay"
                                style={{ width: `${freeShippingProgress * 100}%` }}
                            />
                        </span>
                    </div>
                )}

                <div className="flex-1 px-6 py-5 overflow-y-auto">
                    {lines.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="mb-6 text-sm text-mute">{t.bag.empty}</p>
                            <Link href="/shop" onClick={close} className="btn btn-outline btn-sm">
                                {t.bag.emptyCta}
                            </Link>
                        </div>
                    ) : (
                        <ul className="space-y-6">
                            {lines.map((line) => (
                                <li key={line.id} className="flex gap-4">
                                    <Link
                                        href={`/p/${line.product.slug}`}
                                        onClick={close}
                                        className="relative w-20 h-24 overflow-hidden shrink-0 bg-card"
                                    >
                                        <Image
                                            src={line.product.image}
                                            alt={line.product.name[lang]}
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                        />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <Link href={`/p/${line.product.slug}`} onClick={close} className="text-sm">
                                                {line.product.name[lang]}
                                            </Link>
                                            <span className="text-sm ticker">{price(line.product.price * line.qty)}</span>
                                        </div>
                                        <p className="mt-1 mb-3 text-xs text-mute">
                                            {price(line.product.price)} {t.bag.each}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <QtyStepper value={line.qty} onChange={(qty) => setQty(line.id, qty)} />
                                            <button
                                                type="button"
                                                onClick={() => removeLine(line.id)}
                                                className="text-xs underline text-mute underline-offset-4 hover:text-ink"
                                            >
                                                {t.bag.remove}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {lines.length > 0 && (
                    <footer className="px-6 py-5 border-t rule bg-card">
                        <form
                            className="flex gap-2 mb-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                setBad(!applyPromo(code));
                            }}
                        >
                            <label className="sr-only" htmlFor="promo">
                                {t.bag.promo}
                            </label>
                            <input
                                id="promo"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                placeholder={t.bag.promo}
                                className="flex-1 px-3 py-2 text-sm bg-transparent border rule focus:outline-none focus:border-ink"
                            />
                            <button type="submit" className="btn btn-outline btn-sm">
                                {t.bag.apply}
                            </button>
                        </form>
                        {bad && <p className="mb-3 text-xs text-sale">{t.bag.promoBad}</p>}

                        <dl className="mb-5 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-mute">{t.bag.subtotal}</dt>
                                <dd className="ticker">{price(subtotal)}</dd>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sale">
                                    <dt>
                                        {t.bag.discount} · {promo}
                                    </dt>
                                    <dd className="ticker">−{price(discount)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <dt className="text-mute">{t.bag.shipping}</dt>
                                <dd className="ticker">{shipping === 0 ? t.bag.free : price(shipping)}</dd>
                            </div>
                            <div className="flex justify-between pt-2 text-base border-t rule">
                                <dt>{t.bag.total}</dt>
                                <dd className="ticker">{price(total)}</dd>
                            </div>
                        </dl>

                        <Link href="/checkout" onClick={close} className="justify-center w-full btn">
                            {t.bag.checkout}
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                        <button
                            type="button"
                            onClick={close}
                            className="block w-full mt-3 text-xs underline text-mute underline-offset-4"
                        >
                            {t.bag.keep}
                        </button>
                    </footer>
                )}
            </aside>
        </div>
    );
}

/* -------------------------------------------------------------------- toast */

export function Toast() {
    const { toast, t, lang } = useStore();
    const product = toast ? getProduct(toast.slug) : null;
    return (
        <div
            aria-live="polite"
            className={`fixed z-[60] bottom-5 start-5 flex items-center gap-3 bg-ink text-canvas px-4 py-3 text-sm transition-all duration-300 ${
                product ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
            }`}
        >
            {product && (
                <>
                    <span className="relative w-8 h-8 overflow-hidden shrink-0">
                        <Image src={product.image} alt="" fill sizes="32px" className="object-cover" />
                    </span>
                    <span>
                        {product.name[lang]} · {t.product.added}
                    </span>
                </>
            )}
        </div>
    );
}
