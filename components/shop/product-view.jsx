'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { products, SHAPES, FACE_SHAPES, LENS_UPGRADES } from '../../data/eyewear';
import { useShop } from './providers';
import { SpinViewer } from './spin-viewer';
import { ProductCard } from './product-card';
import { Reveal } from './reveal';
import { TryOn } from './try-on';
import { IconHeart, IconArrow } from './icons';

function ZoomPhoto({ src, alt }) {
    const [origin, setOrigin] = useState('50% 50%');
    const [zoom, setZoom] = useState(false);

    return (
        <div
            className="relative w-full overflow-hidden aspect-square rounded-2xl bg-bone"
            onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setOrigin(
                    `${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`
                );
            }}
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
        >
            <Image
                src={src}
                alt={alt}
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out"
                style={{ transformOrigin: origin, transform: zoom ? 'scale(1.75)' : 'scale(1)' }}
            />
        </div>
    );
}

function Accordion({ title, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b hairline">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between w-full py-4 text-start"
            >
                <span className="text-sm tracking-[0.1em] uppercase">{title}</span>
                <span
                    className="text-xl leading-none transition-transform duration-300"
                    style={{ transform: open ? 'rotate(45deg)' : 'none' }}
                >
                    +
                </span>
            </button>
            <div
                className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ maxHeight: open ? '32rem' : 0, opacity: open ? 1 : 0 }}
            >
                <div className="pb-6 text-sm leading-relaxed text-inksoft">{children}</div>
            </div>
        </div>
    );
}

function SpecDiagram({ specs, t }) {
    return (
        <div>
            <svg viewBox="0 0 300 110" className="w-full max-w-sm mb-4" role="img" aria-label={t.product.specs}>
                <g fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink">
                    <rect x="34" y="34" width="86" height="52" rx="16" />
                    <rect x="150" y="34" width="86" height="52" rx="16" />
                    <path d="M120 52c10-6 20-6 30 0" />
                    <path d="M34 46 12 38M236 46l22-8" />
                </g>
                <g stroke="currentColor" strokeWidth="1" className="text-brass">
                    <path d="M34 98h86M120 98h30M150 98h86" />
                    <path d="M34 94v8M120 94v8M150 94v8M236 94v8" />
                </g>
                <g className="fill-current text-inksoft" fontSize="9">
                    <text x="70" y="110" textAnchor="middle">
                        {specs.lens}
                    </text>
                    <text x="135" y="110" textAnchor="middle">
                        {specs.bridge}
                    </text>
                    <text x="193" y="110" textAnchor="middle">
                        {specs.lens}
                    </text>
                </g>
            </svg>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                {[
                    [t.product.lensWidth, `${specs.lens} mm`],
                    [t.product.bridge, `${specs.bridge} mm`],
                    [t.product.temple, `${specs.temple} mm`],
                    [t.product.weight, `${specs.weight} g`]
                ].map(([label, value]) => (
                    <div key={label}>
                        <dt className="text-xs text-inksoft">{label}</dt>
                        <dd className="ticker-digit">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export function ProductView({ slug }) {
    const { t, lang, price, addItem, wishlist, toggleWish } = useShop();
    const product = products.find((p) => p.slug === slug);
    const [index, setIndex] = useState(0);
    const [lensId, setLensId] = useState('standard');
    const [view, setView] = useState('photo');
    const [justAdded, setJustAdded] = useState(false);
    const [tryOnOpen, setTryOnOpen] = useState(false);

    if (!product) return null;

    const variant = product.variants[index];
    const lens = LENS_UPGRADES.find((l) => l.id === lensId);
    const totalPrice = product.price + lens.price;
    const wished = wishlist.includes(product.slug);
    const related = products.filter((p) => p.slug !== product.slug && p.shape === product.shape).slice(0, 4);
    const fallback = products.filter((p) => p.slug !== product.slug).slice(0, 4);
    const suggestions = (related.length >= 3 ? related : fallback).slice(0, 4);

    const handleAdd = () => {
        addItem(variant.id, lensId);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2200);
    };

    return (
        <>
            <nav className="px-5 pt-8 text-xs sm:px-10 text-inksoft">
                <div className="mx-auto max-w-[1600px] flex gap-2">
                    <Link href="/" className="hover:text-ink">
                        AYIN
                    </Link>
                    <span>/</span>
                    <Link href="/collection" className="hover:text-ink">
                        {t.nav.collection}
                    </Link>
                    <span>/</span>
                    <span className="text-ink">{product.name[lang]}</span>
                </div>
            </nav>

            <section className="px-5 py-8 sm:px-10 sm:py-12">
                <div className="grid gap-10 mx-auto max-w-[1600px] lg:grid-cols-2 lg:gap-16">
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <div className="flex gap-2 mb-4">
                            {['photo', 'spin'].map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setView(mode)}
                                    className={`px-4 py-2 text-[0.68rem] tracking-[0.16em] uppercase rounded-full border transition-all ${
                                        view === mode ? 'bg-ink text-bone border-ink' : 'hairline hover:border-ink/40'
                                    }`}
                                >
                                    {mode === 'photo' ? t.product.details : t.product.spinHint}
                                </button>
                            ))}
                        </div>

                        {view === 'photo' ? (
                            <ZoomPhoto src={variant.image} alt={`${product.name[lang]} ${variant.color[lang]}`} />
                        ) : (
                            <div className="p-4 rounded-2xl bg-bone sm:p-8">
                                <SpinViewer
                                    key={variant.id}
                                    src={variant.image}
                                    alt={product.name[lang]}
                                    label={t.product.spin}
                                />
                            </div>
                        )}

                        {product.variants.length > 1 && (
                            <div className="flex gap-3 mt-4 overflow-x-auto scrollbar-hidden">
                                {product.variants.map((option, i) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setIndex(i)}
                                        className={`relative w-20 h-20 overflow-hidden rounded-xl shrink-0 border transition-all ${
                                            i === index ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <Image src={option.image} alt={option.color[lang]} fill sizes="80px" className="object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <p className="eyebrow">{SHAPES[product.shape][lang]}</p>
                            {product.badge && (
                                <span className="px-3 py-1 text-[0.6rem] tracking-[0.18em] uppercase rounded-full bg-bone">
                                    {t.badges[product.badge]}
                                </span>
                            )}
                        </div>

                        <h1 className="text-[clamp(2.4rem,6vw,4rem)] mb-3">{product.name[lang]}</h1>
                        <p className="mb-5 text-inksoft">{product.tagline[lang]}</p>

                        <div className="flex items-baseline gap-3 mb-8">
                            <span className="display text-3xl ticker-digit">{price(totalPrice)}</span>
                            {product.compareAt && lensId === 'standard' && (
                                <span className="line-through text-inksoft/70 ticker-digit">{price(product.compareAt)}</span>
                            )}
                        </div>

                        <div className="mb-8">
                            <div className="flex items-baseline justify-between mb-3">
                                <p className="eyebrow">{t.product.color}</p>
                                <p className="text-sm text-inksoft">{variant.color[lang]}</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {product.variants.map((option, i) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setIndex(i)}
                                        aria-label={option.color[lang]}
                                        className={`w-9 h-9 rounded-full border transition-all ${
                                            i === index
                                                ? 'ring-1 ring-offset-2 ring-ink ring-offset-paper'
                                                : 'hairline hover:scale-110'
                                        }`}
                                        style={{ background: option.hex }}
                                    />
                                ))}
                            </div>
                            <p className="mt-3 text-xs text-inksoft">
                                {t.product.lens}: {variant.lens[lang]}
                                <span
                                    className="inline-block w-3 h-3 ms-2 align-middle rounded-full"
                                    style={{ background: variant.lensHex }}
                                />
                            </p>
                        </div>

                        <div className="mb-8">
                            <p className="mb-3 eyebrow">{t.product.lensOption}</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {LENS_UPGRADES.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setLensId(option.id)}
                                        className={`flex items-center justify-between px-4 py-3 text-sm border rounded-xl transition-all text-start ${
                                            lensId === option.id ? 'border-ink bg-bone' : 'hairline hover:border-ink/40'
                                        }`}
                                    >
                                        <span>{option.label[lang]}</span>
                                        <span className="text-xs text-inksoft ticker-digit">
                                            {option.price === 0 ? '—' : `+${price(option.price)}`}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 mb-4">
                            <button type="button" onClick={handleAdd} className="flex-1 btn-ayin">
                                <span>{justAdded ? t.product.added : t.product.addToCart}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleWish(product.slug)}
                                aria-label="wishlist"
                                className="grid border rounded-full w-14 h-14 place-items-center hairline hover:border-ink transition-colors"
                            >
                                <IconHeart filled={wished} className={`w-5 h-5 ${wished ? 'text-brass' : ''}`} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setTryOnOpen(true)}
                            className="w-full mb-4 btn-ayin btn-ghost btn-sm"
                        >
                            <span>{t.tryOn.cta}</span>
                        </button>

                        <p className="flex items-center gap-2 mb-10 text-xs text-inksoft">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                            {t.product.inStock}
                        </p>

                        <div className="border-t hairline">
                            <Accordion title={t.product.story} defaultOpen>
                                {product.story[lang]}
                            </Accordion>
                            <Accordion title={t.product.details}>
                                <ul className="space-y-2">
                                    {product.details[lang].map((line) => (
                                        <li key={line} className="flex gap-3">
                                            <span className="mt-2 w-1 h-1 rounded-full bg-brass shrink-0" />
                                            {line}
                                        </li>
                                    ))}
                                </ul>
                            </Accordion>
                            <Accordion title={t.product.specs}>
                                <SpecDiagram specs={product.specs} t={t} />
                            </Accordion>
                            <Accordion title={t.product.shipping}>{t.product.shippingBody}</Accordion>
                        </div>

                        <div className="mt-8">
                            <p className="mb-3 eyebrow">{t.product.fitsFaces}</p>
                            <div className="flex flex-wrap gap-2">
                                {product.fits.map((face) => (
                                    <span key={face} className="px-4 py-2 text-xs rounded-full bg-bone">
                                        {FACE_SHAPES[face][lang]}
                                    </span>
                                ))}
                                <Link href="/fit" className="px-4 py-2 text-xs rounded-full link-line text-brass">
                                    {t.hero.ctaAlt} →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-5 py-20 sm:px-10 bg-bone">
                <div className="mx-auto max-w-[1600px]">
                    <Reveal>
                        <h2 className="mb-10">{t.product.related}</h2>
                    </Reveal>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
                        {suggestions.map((item, i) => (
                            <Reveal key={item.slug} delay={i * 90}>
                                <ProductCard product={item} />
                            </Reveal>
                        ))}
                    </div>
                    <Reveal className="flex justify-center mt-12">
                        <Link href="/collection" className="btn-ayin btn-ghost">
                            <span>{t.sections.all}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                    </Reveal>
                </div>
            </section>

            {tryOnOpen && <TryOn product={product} variant={variant} onClose={() => setTryOnOpen(false)} />}
        </>
    );
}
