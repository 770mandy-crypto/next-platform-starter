'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { products, CATEGORIES, productsIn } from '../../data/catalogue';
import { useShop } from './providers';
import { Hero, Marquee } from './hero';
import { ProductCard } from './product-card';
import { QuickView } from './quick-view';
import { SpinViewer } from './spin-viewer';
import { Reveal } from './reveal';
import { Newsletter } from './footer';
import { IconArrow } from './icons';

const FEATURED = ['sovereign', 'vault', 'tennis'];
// Clean studio shots read best on the turntable.
const SPIN_PICKS = ['sovereign', 'hexa-noir', 'tennis', 'lumen', 'cord'];

function SectionHead({ eyebrow, title, sub, href, cta }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
                {eyebrow && <p className="mb-3 eyebrow">{eyebrow}</p>}
                <h2>{title}</h2>
                {sub && <p className="max-w-md mt-3 text-sm text-inksoft">{sub}</p>}
            </div>
            {href && (
                <Link href={href} className="text-sm link-line whitespace-nowrap">
                    {cta} →
                </Link>
            )}
        </div>
    );
}

function SpinShowcase() {
    const { t, lang, price } = useShop();
    const [index, setIndex] = useState(0);
    const picks = SPIN_PICKS.map((slug) => products.find((p) => p.slug === slug))
        .filter(Boolean)
        .map((product) => ({ product, variant: product.variants[0] }));
    const { product, variant } = picks[index];

    return (
        <section className="px-5 py-24 sm:px-10 bg-bone sm:py-32">
            <div className="mx-auto max-w-[1600px]">
                <Reveal>
                    <SectionHead eyebrow={t.product.spinHint} title={t.product.spin} sub={product.tagline[lang]} />
                </Reveal>

                <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
                    <Reveal className="relative p-4 overflow-hidden border bg-plate rounded-none hairline sm:p-10">
                        <SpinViewer
                            key={variant.id}
                            src={variant.image}
                            alt={product.name[lang]}
                            label={t.product.spin}
                            className="max-w-xl mx-auto"
                        />
                    </Reveal>

                    <Reveal delay={120} className="flex flex-col gap-3">
                        {picks.map(({ product: item, variant: itemVariant }, i) => (
                            <button
                                key={itemVariant.id}
                                type="button"
                                onClick={() => setIndex(i)}
                                className={`flex items-center gap-4 p-3 text-start transition-all rounded-none border ${
                                    i === index ? 'bg-paper border-ink/20 shadow-sm' : 'border-transparent hover:bg-paper/60'
                                }`}
                            >
                                <span className="relative w-16 h-16 overflow-hidden rounded-none bg-plate shrink-0">
                                    <Image
                                        src={itemVariant.image}
                                        alt=""
                                        fill
                                        sizes="64px"
                                        className="object-cover"
                                    />
                                </span>
                                <span className="min-w-0">
                                    <span className="block display text-lg truncate">{item.name[lang]}</span>
                                    <span className="block text-xs text-inksoft">{itemVariant.color[lang]}</span>
                                </span>
                                <span className="text-sm ms-auto ticker-digit">{price(item.price)}</span>
                            </button>
                        ))}
                        <Link href={`/product/${product.slug}`} className="mt-3 btn-ayin">
                            <span>{t.product.details}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

function StoryStrip() {
    const { t } = useShop();
    return (
        <section className="px-5 py-24 sm:px-10 sm:py-32">
            <div className="grid gap-12 mx-auto max-w-[1600px] lg:grid-cols-2 lg:gap-20 lg:items-center">
                <Reveal mask className="relative overflow-hidden rounded-none aspect-[4/3]">
                    <Image
                        src="/products/vesper-taupe-1.jpg"
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 92vw, 45vw"
                        className="object-cover"
                    />
                </Reveal>
                <div>
                    <Reveal>
                        <p className="mb-3 eyebrow">{t.sections.story}</p>
                        <h2 className="mb-5">{t.story.title}</h2>
                        <p className="mb-10 leading-relaxed text-inksoft">{t.story.lead}</p>
                    </Reveal>
                    <div className="grid gap-6 sm:grid-cols-2">
                        {t.story.steps.map((step, index) => (
                            <Reveal key={step.n} delay={index * 90} className="pt-5 border-t hairline">
                                <p className="mb-2 text-xs tracking-[0.2em] text-brass">{step.n}</p>
                                <h3 className="mb-2">{step.t}</h3>
                                <p className="text-sm leading-relaxed text-inksoft">{step.b}</p>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal delay={200}>
                        <Link href="/story" className="inline-flex mt-10 btn-ayin btn-ghost btn-sm">
                            <span>{t.nav.story}</span>
                        </Link>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}

function Promises() {
    const { t } = useShop();
    return (
        <section className="px-5 py-24 sm:px-10 bg-bone sm:py-28">
            <div className="mx-auto max-w-[1600px]">
                <Reveal>
                    <p className="mb-10 eyebrow">{t.sections.promises}</p>
                </Reveal>
                <div className="grid gap-8 md:grid-cols-3">
                    {t.promises.map((promise, index) => (
                        <Reveal key={promise.t} delay={index * 110} className="pt-6 border-t hairline">
                            <h3 className="mb-3 display text-2xl">{promise.t}</h3>
                            <p className="text-sm leading-relaxed text-inksoft">{promise.b}</p>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CategoryGrid() {
    const { t, lang } = useShop();
    const entries = Object.entries(CATEGORIES);

    return (
        <section id="categories" className="px-5 py-24 sm:px-10 sm:py-28 scroll-mt-24">
            <div className="mx-auto max-w-[1600px]">
                <Reveal>
                    <SectionHead eyebrow="02" title={t.sections.categories} sub={t.sections.categoriesSub} />
                </Reveal>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {entries.map(([key, entry], index) => {
                        const cover = productsIn(key)[0]?.variants[0];
                        return (
                            <Reveal key={key} delay={(index % 3) * 90}>
                                <Link
                                    href={`/category/${key}`}
                                    className="relative block overflow-hidden group rounded-none bg-plate aspect-[5/4]"
                                >
                                    {cover && (
                                        <Image
                                            src={cover.image}
                                            alt=""
                                            fill
                                            sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 30vw"
                                            className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                                        />
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-ink/70 to-transparent">
                                        <span className="block display text-2xl text-plate">{entry.name[lang]}</span>
                                        <span className="block mt-1 text-xs text-plate/75">
                                            {t.filters.results(productsIn(key).length)}
                                        </span>
                                    </span>
                                </Link>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function FitTeaser() {
    const { t, lang } = useShop();
    return (
        <section className="px-5 py-24 sm:px-10">
            <Reveal className="relative overflow-hidden mx-auto max-w-[1600px] rounded-none border bg-bone text-ink hairline px-8 py-16 sm:px-16 sm:py-24 text-center">
                <div
                    aria-hidden
                    className="absolute inset-x-0 -bottom-40 h-80 blur-3xl opacity-25"
                    style={{ background: 'radial-gradient(ellipse at center, #a9793e 0%, transparent 70%)' }}
                />
                <p className="relative mb-4 eyebrow">AYIN Fit · {CATEGORIES.eyewear.name[lang]}</p>
                <h2 className="relative max-w-2xl mx-auto mb-5">{t.sections.fit}</h2>
                <p className="relative max-w-md mx-auto mb-10 text-inksoft">{t.sections.fitSub}</p>
                <div className="relative flex flex-wrap items-center justify-center gap-3">
                    <Link href="/fit" className="btn-ayin">
                        <span>{t.hero.ctaAlt}</span>
                    </Link>
                    <Link
                        href="/category/eyewear"
                        className="text-xs tracking-[0.1em] uppercase underline text-inksoft underline-offset-4 hover:text-ink"
                    >
                        {CATEGORIES.eyewear.name[lang]}
                    </Link>
                </div>
            </Reveal>
        </section>
    );
}

export function HomeView() {
    const { t } = useShop();
    const [quick, setQuick] = useState(null);
    const featured = FEATURED.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean);

    return (
        <>
            <Hero />
            <Marquee />

            <section className="px-5 py-24 sm:px-10 sm:py-28">
                <div className="mx-auto max-w-[1600px]">
                    <Reveal>
                        <SectionHead
                            eyebrow="01"
                            title={t.sections.featured}
                            sub={t.sections.featuredSub}
                            href="/collection"
                            cta={t.sections.all}
                        />
                    </Reveal>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
                        {featured.map((product, index) => (
                            <Reveal key={product.slug} delay={index * 110}>
                                <ProductCard product={product} onQuickView={setQuick} priority={index === 0} />
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <CategoryGrid />
            <SpinShowcase />
            <StoryStrip />

            <section className="px-5 pb-24 sm:px-10">
                <div className="mx-auto max-w-[1600px]">
                    <Reveal>
                        <SectionHead eyebrow="03" title={t.sections.all} sub={t.sections.allSub} />
                    </Reveal>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
                        {products.slice(0, 8).map((product, index) => (
                            <Reveal key={product.slug} delay={(index % 4) * 90}>
                                <ProductCard product={product} onQuickView={setQuick} />
                            </Reveal>
                        ))}
                    </div>
                    <Reveal className="flex justify-center mt-14">
                        <Link href="/collection" className="btn-ayin">
                            <span>{t.sections.all}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                    </Reveal>
                </div>
            </section>

            <Promises />
            <FitTeaser />
            <Newsletter />
            <QuickView product={quick} onClose={() => setQuick(null)} />
        </>
    );
}
