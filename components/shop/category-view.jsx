'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { products, CATEGORIES, productsIn } from '../../data/catalogue';
import { useShop } from './providers';
import { ProductCard } from './product-card';
import { QuickView } from './quick-view';
import { Reveal } from './reveal';
import { Newsletter } from './footer';
import { IconArrow, IconHeart } from './icons';

/**
 * One product carrying a whole page. A lone card in a four-column grid reads as
 * an empty shop, so a thin category gives its product the room a product page
 * gives it: full image, story, details and specs.
 */
function Spotlight({ product, onQuickView }) {
    const { t, lang, price, wishlist, toggleWish } = useShop();
    const [active, setActive] = useState(0);
    const variant = product.variants[active];
    const wished = wishlist.includes(product.slug);

    return (
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="relative overflow-hidden border rounded-none bg-bone aspect-[4/5] hairline">
                <Image
                    key={variant.id}
                    src={variant.image}
                    alt={`${product.name[lang]} — ${variant.color[lang]}`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 92vw, 46vw"
                    className="object-cover"
                />
                {product.badge && (
                    <span className="absolute top-5 start-5 px-3 py-1 text-[0.62rem] tracking-[0.18em] uppercase rounded-none bg-paper/90 backdrop-blur">
                        {t.badges[product.badge]}
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => toggleWish(product.slug)}
                    aria-label={t.nav.wishlist}
                    className="absolute grid w-10 h-10 transition-transform rounded-full top-4 end-4 place-items-center bg-paper/85 backdrop-blur hover:scale-110 active:scale-95"
                >
                    <IconHeart filled={wished} className={`w-5 h-5 ${wished ? 'text-brass' : 'text-ink'}`} />
                </button>
            </div>

            <div className="flex flex-col justify-center">
                <p className="mb-3 eyebrow">{product.tagline[lang]}</p>
                <h2 className="mb-4">{product.name[lang]}</h2>

                <p className="flex items-baseline gap-3 mb-6">
                    <span className="text-2xl">{price(product.price)}</span>
                    {product.compareAt && (
                        <span className="text-sm line-through text-inksoft">{price(product.compareAt)}</span>
                    )}
                    <span className="text-xs text-inksoft">{t.product.inStock}</span>
                </p>

                <p className="mb-8 leading-relaxed text-inksoft">{product.story[lang]}</p>

                {product.variants.length > 1 && (
                    <div className="flex items-center gap-3 mb-8">
                        <span className="eyebrow me-1">{t.product.color}</span>
                        {product.variants.map((item, index) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setActive(index)}
                                aria-label={item.color[lang]}
                                title={item.color[lang]}
                                className={`w-8 h-8 rounded-full border transition-all ${
                                    index === active
                                        ? 'ring-1 ring-offset-2 ring-ink ring-offset-paper'
                                        : 'hairline hover:scale-110'
                                }`}
                                style={{ background: item.hex }}
                            />
                        ))}
                    </div>
                )}

                <ul className="grid gap-2 mb-8 text-sm sm:grid-cols-2">
                    {product.details[lang].map((line) => (
                        <li key={line} className="flex gap-2 text-inksoft">
                            <span aria-hidden className="mt-2 w-1 h-1 rounded-full bg-brass shrink-0" />
                            {line}
                        </li>
                    ))}
                </ul>

                <dl className="grid grid-cols-2 gap-4 py-6 mb-8 border-y hairline sm:grid-cols-4">
                    {product.specs.map((spec) => (
                        <div key={spec.label.en}>
                            <dt className="mb-1 eyebrow">{spec.label[lang]}</dt>
                            <dd className="text-sm">{spec.value[lang]}</dd>
                        </div>
                    ))}
                </dl>

                <div className="flex flex-wrap gap-3">
                    <Link href={`/product/${product.slug}`} className="btn-ayin">
                        <span>{t.product.view}</span>
                        <IconArrow className="w-4 h-4 rtl:rotate-180" />
                    </Link>
                    <button type="button" onClick={() => onQuickView(product)} className="btn-ayin btn-ghost">
                        <span>{t.product.quickView}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CategoryView({ slug }) {
    const { t, lang } = useShop();
    const [quick, setQuick] = useState(null);
    const category = CATEGORIES[slug];
    const items = productsIn(slug);
    // A category holding one or two products leads with a spotlight; a fuller
    // one goes straight to the grid.
    const spotlight = items.length <= 2 ? items[0] : null;
    const grid = spotlight ? items.slice(1) : items;
    const rest = products.filter((product) => product.category !== slug).slice(0, 4);

    return (
        <>
            <section className="px-5 pt-14 pb-10 sm:px-10 sm:pt-20">
                <div className="mx-auto max-w-[1600px]">
                    <p className="mb-4 eyebrow animate-in-up">{t.filters.results(items.length)}</p>
                    <h1 className="mb-4 max-w-3xl">{category.name[lang]}</h1>
                    <p className="max-w-md text-inksoft">{category.lead[lang]}</p>
                </div>
            </section>

            {spotlight && (
                <section className="px-5 pb-16 sm:px-10 sm:pb-20">
                    <Reveal className="mx-auto max-w-[1600px]">
                        <Spotlight product={spotlight} onQuickView={setQuick} />
                    </Reveal>
                </section>
            )}

            {grid.length > 0 && (
                <section className="px-5 pb-16 sm:px-10 sm:pb-20">
                    <div className="mx-auto max-w-[1600px]">
                        {spotlight && (
                            <Reveal>
                                <h2 className="mb-8 text-2xl">{t.product.alsoIn(category.name[lang])}</h2>
                            </Reveal>
                        )}
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-8">
                            {grid.map((product, index) => (
                                <Reveal key={product.slug} delay={(index % 4) * 80}>
                                    <ProductCard product={product} onQuickView={setQuick} priority={index < 4} />
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section className="px-5 py-16 border-t sm:px-10 sm:py-20 hairline bg-bone">
                <div className="mx-auto max-w-[1600px]">
                    <Reveal>
                        <p className="mb-1 eyebrow">{t.sections.more}</p>
                        <h2 className="mb-10 text-2xl">{t.sections.moreSub}</h2>
                    </Reveal>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
                        {rest.map((product, index) => (
                            <Reveal key={product.slug} delay={(index % 4) * 80}>
                                <ProductCard product={product} onQuickView={setQuick} />
                            </Reveal>
                        ))}
                    </div>
                    <Reveal className="flex flex-wrap justify-center gap-3 mt-12">
                        <Link href="/collection" className="btn-ayin">
                            <span>{t.sections.all}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </Link>
                        {Object.entries(CATEGORIES)
                            .filter(([key]) => key !== slug)
                            .map(([key, entry]) => (
                                <Link
                                    key={key}
                                    href={`/category/${key}`}
                                    className="chip"
                                >
                                    {entry.name[lang]}
                                </Link>
                            ))}
                    </Reveal>
                </div>
            </section>

            <Newsletter />
            <QuickView product={quick} onClose={() => setQuick(null)} />
        </>
    );
}
