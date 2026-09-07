'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, COLOURS, getProduct, inStock, products, productsIn } from '../../data/catalogue';
import { useStore } from '../../lib/store/context';
import { Newsletter, ServiceBar } from './chrome';
import { ProductCard } from './product-card';
import { Rise } from './rise';
import { IconArrow, IconClose, IconHeart, IconSearch } from './icons';

const WRAP = 'mx-auto max-w-[1500px]';
const PAD = 'px-5 sm:px-8';

function SectionHead({ eyebrow, title, sub, href, cta }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
                {eyebrow && <p className="mb-2 label">{eyebrow}</p>}
                <h2>{title}</h2>
                {sub && <p className="mt-2 text-sm text-mute">{sub}</p>}
            </div>
            {href && (
                <Link href={href} className="text-sm ul-hover whitespace-nowrap">
                    {cta} →
                </Link>
            )}
        </div>
    );
}

/* --------------------------------------------------------------------- home */

export function HomeView() {
    const { t, lang } = useStore();
    const newest = products.filter((p) => p.badge === 'new').concat(products.filter((p) => p.badge !== 'new')).slice(0, 4);
    const look = ['chrono-watch', 'cuban-bracelet', 'hexa-black'].map(getProduct).filter(Boolean);

    return (
        <>
            <section className="relative bg-card">
                <div className="grid lg:grid-cols-2">
                    <div className="relative order-1 aspect-[4/3] lg:order-none lg:aspect-auto lg:min-h-[62vh]">
                        <Image
                            src="/shop/bag.jpg"
                            alt=""
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-cover"
                        />
                    </div>
                    <div className={`flex flex-col justify-center ${PAD} py-14 lg:py-24`}>
                        <p className="mb-5 label">{t.home.heroEyebrow}</p>
                        <h1 className="mb-6 whitespace-pre-line">{t.home.heroTitle}</h1>
                        <p className="max-w-md mb-9 text-mute">{t.home.heroBody}</p>
                        <div className="flex flex-wrap gap-3">
                            <Link href="/shop" className="btn">
                                {t.home.heroCta}
                                <IconArrow className="w-4 h-4 rtl:rotate-180" />
                            </Link>
                            <Link href="/shop?sort=new" className="btn btn-outline">
                                {t.home.heroAlt}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <ServiceBar />

            <section className={`${PAD} py-16 sm:py-20`}>
                <div className={WRAP}>
                    <Rise>
                        <SectionHead
                            eyebrow="01"
                            title={t.home.newTitle}
                            sub={t.home.newSub}
                            href="/shop"
                            cta={t.listing.all}
                        />
                    </Rise>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4 sm:gap-x-6">
                        {newest.map((product, index) => (
                            <Rise key={product.slug} delay={(index % 4) * 70}>
                                <ProductCard product={product} priority={index < 2} />
                            </Rise>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`${PAD} py-16 border-t rule sm:py-20`}>
                <div className={WRAP}>
                    <Rise>
                        <SectionHead eyebrow="02" title={t.home.categoriesTitle} sub={t.home.categoriesSub} />
                    </Rise>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {Object.entries(CATEGORIES).map(([key, entry], index) => {
                            const cover = productsIn(key)[0];
                            return (
                                <Rise key={key} delay={(index % 3) * 70}>
                                    <Link href={`/c/${key}`} className="relative block overflow-hidden group aspect-[5/4] bg-card">
                                        {cover && (
                                            <Image
                                                src={cover.image}
                                                alt=""
                                                fill
                                                sizes="(max-width: 640px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        )}
                                        <span className="absolute px-4 py-2 text-sm bottom-4 start-4 bg-canvas">
                                            {entry.name[lang]}
                                        </span>
                                    </Link>
                                </Rise>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="border-t rule bg-card">
                <div className="grid lg:grid-cols-2">
                    <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[520px]">
                        <Image src="/shop/chrono.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                    </div>
                    <div className={`${PAD} py-14 lg:py-20 flex flex-col justify-center`}>
                        <p className="mb-3 label">{t.home.lookTitle}</p>
                        <h2 className="mb-4">{t.home.lookBody}</h2>
                        <ul className="my-6 divide-y rule">
                            {look.map((product) => (
                                <li key={product.slug} className="py-3">
                                    <Link href={`/p/${product.slug}`} className="flex items-center gap-4 group">
                                        <span className="relative w-14 h-14 shrink-0 bg-canvas">
                                            <Image src={product.image} alt="" fill sizes="56px" className="object-cover" />
                                        </span>
                                        <span className="flex-1 text-sm ul-hover">{product.name[lang]}</span>
                                        <span className="text-sm ticker text-mute">{product.price} ₪</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Link href="/shop" className="self-start btn btn-outline">
                            {t.home.lookCta}
                        </Link>
                    </div>
                </div>
            </section>

            <section className={`${PAD} py-20 text-center border-t rule`}>
                <div className="max-w-2xl mx-auto">
                    <p className="mb-3 label">{t.home.editTitle}</p>
                    <h2 className="mb-6">{t.home.editBody}</h2>
                    <Link href="/about" className="btn btn-outline">
                        {t.home.editCta}
                    </Link>
                </div>
            </section>

            <Newsletter />
        </>
    );
}

/* ------------------------------------------------------------------ listing */

const BANDS = [
    { id: 'under200', label: { he: 'עד 200 ₪', en: 'Under $55' }, test: (p) => p.price < 200 },
    { id: 'mid', label: { he: '200–500 ₪', en: '$55–$140' }, test: (p) => p.price >= 200 && p.price <= 500 },
    { id: 'over500', label: { he: 'מעל 500 ₪', en: 'Over $140' }, test: (p) => p.price > 500 }
];

export function ListingView({ category = null }) {
    const { t, lang } = useStore();
    const params = useSearchParams();
    const [colour, setColour] = useState(null);
    const [band, setBand] = useState(null);
    const [sort, setSort] = useState(params.get('sort') === 'new' ? 'new' : 'featured');
    const entry = category ? CATEGORIES[category] : null;
    const pool = category ? productsIn(category) : products;

    const list = useMemo(() => {
        let out = pool.filter((product) => {
            if (colour && product.colour !== colour) return false;
            if (band && !BANDS.find((b) => b.id === band).test(product)) return false;
            return true;
        });
        if (sort === 'priceAsc') out = [...out].sort((a, b) => a.price - b.price);
        if (sort === 'priceDesc') out = [...out].sort((a, b) => b.price - a.price);
        if (sort === 'new') out = [...out].sort((a, b) => Number(b.badge === 'new') - Number(a.badge === 'new'));
        return out;
    }, [pool, colour, band, sort]);

    const usedColours = [...new Set(pool.map((product) => product.colour))];
    const dirty = colour || band;

    return (
        <>
            <section className={`${PAD} pt-12 pb-8 sm:pt-16`}>
                <div className={WRAP}>
                    <p className="mb-3 label">{t.listing.results(list.length)}</p>
                    <h1 className="mb-3">{entry ? entry.name[lang] : t.listing.all}</h1>
                    <p className="max-w-md text-sm text-mute">{entry ? entry.lead[lang] : t.listing.allSub}</p>
                </div>
            </section>

            <section className={`${PAD} sticky top-[57px] z-30 py-3 border-y rule bg-canvas/95 backdrop-blur`}>
                <div className={`${WRAP} flex flex-wrap items-center gap-2`}>
                    <span className="hidden label me-1 sm:inline">{t.listing.filters}</span>

                    {!category &&
                        Object.entries(CATEGORIES).map(([key, item]) => (
                            <Link key={key} href={`/c/${key}`} className="pill">
                                {item.name[lang]}
                            </Link>
                        ))}

                    {usedColours.length > 1 && (
                        <>
                            <span className="hidden w-px h-5 mx-1 bg-rule sm:block" />
                            {usedColours.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setColour(colour === key ? null : key)}
                                    aria-label={COLOURS[key].name?.[lang] ?? COLOURS[key][lang]}
                                    title={COLOURS[key][lang]}
                                    aria-pressed={colour === key}
                                    className={`w-6 h-6 rounded-full border transition-transform ${
                                        colour === key ? 'ring-1 ring-offset-2 ring-ink ring-offset-canvas' : 'rule hover:scale-110'
                                    }`}
                                    style={{ background: COLOURS[key].hex }}
                                />
                            ))}
                        </>
                    )}

                    <span className="hidden w-px h-5 mx-1 bg-rule sm:block" />
                    {BANDS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setBand(band === item.id ? null : item.id)}
                            aria-pressed={band === item.id}
                            className={`pill ${band === item.id ? 'pill-on' : ''}`}
                        >
                            {item.label[lang]}
                        </button>
                    ))}

                    <div className="flex items-center gap-3 ms-auto">
                        {dirty && (
                            <button
                                type="button"
                                onClick={() => {
                                    setColour(null);
                                    setBand(null);
                                }}
                                className="text-xs underline text-mute underline-offset-4 hover:text-ink"
                            >
                                {t.listing.clear}
                            </button>
                        )}
                        <label className="sr-only" htmlFor="sort">
                            {t.listing.sort}
                        </label>
                        <select
                            id="sort"
                            value={sort}
                            onChange={(event) => setSort(event.target.value)}
                            className="px-3 py-2 text-xs bg-transparent border rule focus:outline-none"
                        >
                            {Object.entries(t.listing.sortOptions).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className={`${PAD} py-12 sm:py-16`}>
                <div className={WRAP}>
                    {list.length === 0 ? (
                        <p className="py-24 text-sm text-center text-mute">{t.listing.none}</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 sm:gap-x-6">
                            {list.map((product, index) => (
                                <Rise key={product.slug} delay={(index % 4) * 70}>
                                    <ProductCard product={product} priority={index < 4} />
                                </Rise>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <Newsletter />
        </>
    );
}

/* ------------------------------------------------------------------ product */

function Accordion({ title, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b rule">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="flex items-center justify-between w-full py-4 text-start"
            >
                <span className="text-sm">{title}</span>
                <span className="text-lg leading-none transition-transform duration-300" style={{ transform: open ? 'rotate(45deg)' : 'none' }}>
                    +
                </span>
            </button>
            <div className="grid transition-all duration-400" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
                <div className="overflow-hidden">
                    <div className="pb-5 text-sm leading-relaxed text-mute">{children}</div>
                </div>
            </div>
        </div>
    );
}

export function ProductView({ slug }) {
    const { t, lang, price, add, saved, toggleSave } = useStore();
    const product = getProduct(slug);
    const [zoom, setZoom] = useState(false);
    const [origin, setOrigin] = useState('50% 50%');

    if (!product) return null;

    const isSaved = saved.includes(product.slug);
    const available = inStock(product);
    const related = products.filter((p) => p.slug !== product.slug && p.category === product.category);
    const fallback = products.filter((p) => p.slug !== product.slug && p.category !== product.category);
    const suggestions = [...related, ...fallback].slice(0, 4);

    return (
        <>
            <nav className={`${PAD} pt-6 text-xs text-mute`}>
                <div className={`${WRAP} flex gap-2`}>
                    <Link href="/" className="hover:text-ink">
                        MAOR
                    </Link>
                    <span>/</span>
                    <Link href={`/c/${product.category}`} className="hover:text-ink">
                        {CATEGORIES[product.category].name[lang]}
                    </Link>
                    <span>/</span>
                    <span className="text-ink">{product.name[lang]}</span>
                </div>
            </nav>

            <section className={`${PAD} py-8`}>
                <div className={`${WRAP} grid gap-10 lg:grid-cols-2 lg:gap-16`}>
                    <div
                        className="relative overflow-hidden aspect-square bg-card"
                        onMouseEnter={() => setZoom(true)}
                        onMouseLeave={() => setZoom(false)}
                        onMouseMove={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setOrigin(
                                `${((event.clientX - rect.left) / rect.width) * 100}% ${
                                    ((event.clientY - rect.top) / rect.height) * 100
                                }%`
                            );
                        }}
                    >
                        <Image
                            src={product.image}
                            alt={product.name[lang]}
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-cover transition-transform duration-500"
                            style={{ transformOrigin: origin, transform: zoom ? 'scale(1.7)' : 'scale(1)' }}
                        />
                    </div>

                    {/* One long column: nothing a shopper needs is hidden behind a tab. */}
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <p className="mb-2 label">{CATEGORIES[product.category].name[lang]}</p>
                        <h1 className="mb-2">{product.name[lang]}</h1>
                        <p className="mb-6 text-mute">{product.subtitle[lang]}</p>

                        <div className="flex items-baseline gap-3 mb-6">
                            <span className="text-2xl ticker">{price(product.price)}</span>
                            {product.compareAt && (
                                <span className="line-through ticker text-mute">{price(product.compareAt)}</span>
                            )}
                            {/* forced LTR: a bidi-neutral minus jumps to the wrong end in Hebrew */}
                            {product.compareAt && (
                                <span
                                    dir="ltr"
                                    className="px-2 py-1 text-[0.62rem] tracking-[0.14em] uppercase border text-sale border-current"
                                >
                                    −{Math.round((1 - product.price / product.compareAt) * 100)}%
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 py-4 mb-6 border-y rule">
                            <span
                                aria-hidden
                                className="w-4 h-4 border rounded-full rule"
                                style={{ background: COLOURS[product.colour].hex }}
                            />
                            <span className="text-sm">{COLOURS[product.colour][lang]}</span>
                            <span className={`text-xs ms-auto ${available ? 'text-mute' : 'text-sale'}`}>
                                {available ? t.product.stock : t.listing.soldOut}
                            </span>
                        </div>

                        <div className="flex gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => add(product)}
                                disabled={!available}
                                className="flex-1 btn"
                            >
                                {available ? t.product.add : t.listing.soldOut}
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleSave(product.slug)}
                                aria-label={isSaved ? t.product.saved : t.product.save}
                                aria-pressed={isSaved}
                                className="grid border w-14 h-14 place-items-center rule hover:border-ink"
                            >
                                <IconHeart filled={isSaved} className={`w-5 h-5 ${isSaved ? 'text-clay' : ''}`} />
                            </button>
                        </div>

                        <p className="mb-8 text-sm leading-relaxed">{product.story[lang]}</p>

                        <Accordion title={t.product.details} defaultOpen>
                            <ul className="space-y-2">
                                {product.details[lang].map((line) => (
                                    <li key={line} className="flex gap-2">
                                        <span aria-hidden className="mt-2 w-1 h-1 rounded-full bg-clay shrink-0" />
                                        {line}
                                    </li>
                                ))}
                            </ul>
                        </Accordion>

                        <Accordion title={t.product.specs}>
                            <dl className="grid grid-cols-2 gap-4">
                                {product.specs.map((spec) => (
                                    <div key={spec.label.en}>
                                        <dt className="mb-1 label">{spec.label[lang]}</dt>
                                        <dd className="text-sm text-ink">{spec.value[lang]}</dd>
                                    </div>
                                ))}
                            </dl>
                        </Accordion>

                        <Accordion title={t.product.care}>{product.care[lang]}</Accordion>
                        <Accordion title={t.product.shipping}>{t.product.shippingBody}</Accordion>
                    </div>
                </div>
            </section>

            <section className={`${PAD} py-16 border-t rule`}>
                <div className={WRAP}>
                    <Rise>
                        <SectionHead title={t.product.complete} href="/shop" cta={t.listing.all} />
                    </Rise>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4 sm:gap-x-6">
                        {suggestions.map((item, index) => (
                            <Rise key={item.slug} delay={(index % 4) * 70}>
                                <ProductCard product={item} />
                            </Rise>
                        ))}
                    </div>
                </div>
            </section>

            {/* mobile buy bar, the convention on every phone-first shop */}
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 px-4 py-3 border-t lg:hidden rule bg-canvas/95 backdrop-blur">
                <div className="min-w-0">
                    <p className="text-sm truncate">{product.name[lang]}</p>
                    <p className="text-xs ticker text-mute">{price(product.price)}</p>
                </div>
                <button type="button" onClick={() => add(product)} disabled={!available} className="ms-auto btn btn-sm">
                    {available ? t.product.add : t.listing.soldOut}
                </button>
            </div>
            <div className="h-20 lg:hidden" />
        </>
    );
}

/* ------------------------------------------------------------------- search */

function haystack(product) {
    const category = CATEGORIES[product.category];
    return [
        product.slug,
        product.name.he,
        product.name.en,
        product.subtitle.he,
        product.subtitle.en,
        product.story.he,
        product.story.en,
        category.name.he,
        category.name.en,
        COLOURS[product.colour].he,
        COLOURS[product.colour].en,
        ...product.specs.flatMap((spec) => [spec.value.he, spec.value.en])
    ]
        .join(' ')
        .toLowerCase();
}

const INDEX = products.map((product) => ({ product, text: haystack(product) }));

export function SearchView() {
    const { t, lang } = useStore();
    const router = useRouter();
    const params = useSearchParams();
    const [query, setQuery] = useState(params.get('q') ?? '');
    const input = useRef(null);

    useEffect(() => {
        input.current?.focus();
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            router.replace(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search', { scroll: false });
        }, 300);
        return () => clearTimeout(id);
    }, [query, router]);

    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const results = terms.length === 0 ? [] : INDEX.filter((row) => terms.every((term) => row.text.includes(term))).map((row) => row.product);

    return (
        <>
            <section className={`${PAD} pt-14 pb-8`}>
                <div className="max-w-2xl mx-auto">
                    <p className="mb-3 label">{t.search.title}</p>
                    <h1 className="mb-6">{t.search.placeholder}</h1>
                    <div className="relative">
                        <IconSearch aria-hidden className="absolute w-5 h-5 -translate-y-1/2 start-4 top-1/2 text-mute" />
                        <input
                            ref={input}
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            aria-label={t.search.title}
                            placeholder={t.search.hint}
                            className="w-full py-4 bg-transparent border ps-12 pe-12 rule focus:outline-none focus:border-ink [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    input.current?.focus();
                                }}
                                aria-label={t.search.clear}
                                className="absolute -translate-y-1/2 end-4 top-1/2 text-mute hover:text-ink"
                            >
                                <IconClose className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-5">
                        {Object.entries(CATEGORIES).map(([key, entry]) => (
                            <button key={key} type="button" onClick={() => setQuery(entry.name[lang])} className="pill">
                                {entry.name[lang]}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className={`${PAD} py-10`}>
                <div className={WRAP}>
                    {terms.length === 0 ? (
                        <p className="py-16 text-sm text-center text-mute">{t.search.start}</p>
                    ) : results.length === 0 ? (
                        <p className="py-16 text-sm text-center text-mute">{t.search.empty}</p>
                    ) : (
                        <>
                            <p className="mb-8 text-xs text-center text-mute" aria-live="polite">
                                {t.listing.results(results.length)}
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 sm:gap-x-6">
                                {results.map((product, index) => (
                                    <ProductCard key={product.slug} product={product} priority={index < 4} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>
        </>
    );
}

/* -------------------------------------------------------------------- saved */

export function SavedView() {
    const { t, saved, toggleSave } = useStore();
    const list = saved.map(getProduct).filter(Boolean);

    return (
        <section className={`${PAD} pt-14 pb-20`}>
            <div className={WRAP}>
                <p className="mb-3 label">{t.listing.results(list.length)}</p>
                <h1 className="mb-3">{t.saved.title}</h1>
                <p className="mb-10 text-sm text-mute">{t.saved.sub}</p>

                {list.length === 0 ? (
                    <div className="py-20 text-center">
                        <p className="mb-6 text-sm text-mute">{t.saved.empty}</p>
                        <Link href="/shop" className="btn btn-outline">
                            {t.saved.browse}
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 sm:gap-x-6">
                            {list.map((product, index) => (
                                <ProductCard key={product.slug} product={product} priority={index < 4} />
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => list.forEach((product) => toggleSave(product.slug))}
                            className="block mx-auto mt-12 text-xs underline text-mute underline-offset-4 hover:text-ink"
                        >
                            {t.listing.clear}
                        </button>
                    </>
                )}
            </div>
        </section>
    );
}

/* ----------------------------------------------------------------- checkout */

export function CheckoutView() {
    const { t, lang, price, lines, subtotal, discount, shipping, total, promo, clearBag } = useStore();
    const [state, setState] = useState('idle');
    const [note, setNote] = useState(null);

    if (state === 'done') {
        return (
            <section className={`${PAD} py-24 text-center`}>
                <div className="max-w-md mx-auto">
                    <h1 className="mb-4">{t.checkout.done}</h1>
                    <p className="mb-3 text-sm text-mute">{t.checkout.doneBody}</p>
                    {note && <p className="mb-8 text-xs text-mute">{note}</p>}
                    <Link href="/shop" className="btn btn-outline">
                        {t.checkout.back}
                    </Link>
                </div>
            </section>
        );
    }

    if (lines.length === 0) {
        return (
            <section className={`${PAD} py-24 text-center`}>
                <h1 className="mb-6">{t.bag.empty}</h1>
                <Link href="/shop" className="btn">
                    {t.bag.emptyCta}
                </Link>
            </section>
        );
    }

    const pay = async () => {
        setState('working');
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    items: lines.map((line) => ({ slug: line.product.slug, qty: line.qty })),
                    promo,
                    lang
                })
            });
            const data = await response.json();
            if (response.ok && data.url) {
                window.location.href = data.url;
                return;
            }
            // Stripe is not configured on this deploy: record the order locally
            // rather than leaving the shopper on a dead button.
            setNote(t.checkout.fallback);
            clearBag();
            setState('done');
        } catch {
            setState('idle');
            setNote(t.checkout.error);
        }
    };

    return (
        <section className={`${PAD} py-14`}>
            <div className={`${WRAP} grid gap-10 lg:grid-cols-[1.2fr_1fr]`}>
                <div>
                    <h1 className="mb-8">{t.checkout.title}</h1>
                    <ul className="divide-y rule">
                        {lines.map((line) => (
                            <li key={line.id} className="flex gap-4 py-5">
                                <span className="relative w-20 h-24 shrink-0 bg-card">
                                    <Image src={line.product.image} alt="" fill sizes="80px" className="object-cover" />
                                </span>
                                <span className="flex-1">
                                    <span className="block text-sm">{line.product.name[lang]}</span>
                                    <span className="block mt-1 text-xs text-mute">× {line.qty}</span>
                                </span>
                                <span className="text-sm ticker">{price(line.product.price * line.qty)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <aside className="p-6 h-fit bg-card lg:sticky lg:top-24">
                    <h2 className="mb-6 text-lg">{t.checkout.summary}</h2>
                    <dl className="mb-6 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-mute">{t.bag.subtotal}</dt>
                            <dd className="ticker">{price(subtotal)}</dd>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-sale">
                                <dt>{t.bag.discount}</dt>
                                <dd className="ticker">−{price(discount)}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-mute">{t.bag.shipping}</dt>
                            <dd className="ticker">{shipping === 0 ? t.bag.free : price(shipping)}</dd>
                        </div>
                        <div className="flex justify-between pt-3 text-base border-t rule">
                            <dt>{t.bag.total}</dt>
                            <dd className="ticker">{price(total)}</dd>
                        </div>
                    </dl>
                    <button type="button" onClick={pay} disabled={state === 'working'} className="justify-center w-full btn">
                        {state === 'working' ? t.checkout.working : t.checkout.pay}
                    </button>
                    {note && <p className="mt-4 text-xs text-mute">{note}</p>}
                </aside>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------- pages */

export function AboutView() {
    const { t } = useStore();
    return (
        <>
            <section className={`${PAD} pt-16 pb-10`}>
                <div className="max-w-3xl mx-auto text-center">
                    <p className="mb-4 label">{t.about.title}</p>
                    <h1>{t.about.lead}</h1>
                </div>
            </section>
            <section className="relative aspect-[16/7]">
                <Image src="/shop/necklace.jpg" alt="" fill sizes="100vw" className="object-cover" />
            </section>
            <section className={`${PAD} py-16`}>
                <div className={`${WRAP} grid gap-8 sm:grid-cols-2 lg:grid-cols-4`}>
                    {t.about.steps.map((step, index) => (
                        <Rise key={step.t} delay={index * 80}>
                            <p className="mb-3 label">0{index + 1}</p>
                            <h3 className="mb-2">{step.t}</h3>
                            <p className="text-sm leading-relaxed text-mute">{step.b}</p>
                        </Rise>
                    ))}
                </div>
            </section>
            <Newsletter />
        </>
    );
}

export function HelpView() {
    const { t } = useStore();
    return (
        <>
            <section className={`${PAD} pt-14 pb-10`}>
                <div className="max-w-3xl mx-auto">
                    <p className="mb-3 label">{t.help.title}</p>
                    <h1 className="mb-3">{t.help.lead}</h1>
                </div>
            </section>
            <section className={`${PAD} pb-20`}>
                <div className="max-w-3xl mx-auto space-y-12">
                    {t.help.groups.map((group) => (
                        <div key={group.t}>
                            <h2 className="mb-4 text-xl">{group.t}</h2>
                            <div className="border-t rule">
                                {group.items.map(([question, answer]) => (
                                    <Accordion key={question} title={question}>
                                        {answer}
                                    </Accordion>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            <Newsletter />
        </>
    );
}
