'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { products, CATEGORIES } from '../../data/catalogue';
import { useShop } from './providers';
import { ProductCard } from './product-card';
import { QuickView } from './quick-view';
import { Reveal } from './reveal';
import { IconClose, IconSearch } from './icons';

/**
 * Everything a product can be found by, flattened once per product.
 * The catalogue is small enough that a substring scan beats an index.
 */
function haystack(product) {
    const category = CATEGORIES[product.category];
    const parts = [
        product.slug,
        product.name.he,
        product.name.en,
        product.tagline.he,
        product.tagline.en,
        product.story.he,
        product.story.en,
        category?.name.he,
        category?.name.en
    ];
    for (const variant of product.variants) {
        parts.push(variant.color.he, variant.color.en, variant.accent.he, variant.accent.en);
    }
    for (const spec of product.specs ?? []) {
        parts.push(spec.value.he, spec.value.en);
    }
    return parts.filter(Boolean).join(' ').toLowerCase();
}

const INDEX = products.map((product) => ({ product, text: haystack(product) }));

export function SearchView() {
    const { t, lang } = useShop();
    const router = useRouter();
    const params = useSearchParams();
    const initial = params.get('q') ?? '';
    const [query, setQuery] = useState(initial);
    const [quick, setQuick] = useState(null);
    const input = useRef(null);

    useEffect(() => {
        input.current?.focus();
    }, []);

    // Keep the URL shareable without pushing a history entry per keystroke.
    useEffect(() => {
        const id = setTimeout(() => {
            const next = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search';
            router.replace(next, { scroll: false });
        }, 300);
        return () => clearTimeout(id);
    }, [query, router]);

    const terms = useMemo(
        () =>
            query
                .trim()
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean),
        [query]
    );

    const results = useMemo(() => {
        if (terms.length === 0) return [];
        return INDEX.filter((entry) => terms.every((term) => entry.text.includes(term))).map((entry) => entry.product);
    }, [terms]);

    return (
        <>
            <section className="px-5 pt-14 pb-6 sm:px-10 sm:pt-20">
                <div className="mx-auto max-w-3xl">
                    <p className="mb-4 eyebrow animate-in-up">{t.search.title}</p>
                    <h1 className="mb-4">{t.search.placeholder}</h1>
                    <p className="mb-8 text-inksoft">{t.search.sub}</p>

                    <div className="relative">
                        <IconSearch
                            aria-hidden
                            className="absolute w-5 h-5 -translate-y-1/2 pointer-events-none start-5 top-1/2 text-inksoft"
                        />
                        <input
                            ref={input}
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t.search.placeholder}
                            aria-label={t.search.title}
                            className="w-full py-5 text-lg bg-transparent border rounded-none ps-14 pe-14 hairline focus:outline-none focus:border-ink/40 [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    input.current?.focus();
                                }}
                                aria-label={t.search.clear}
                                className="absolute -translate-y-1/2 end-5 top-1/2 text-inksoft hover:text-ink"
                            >
                                <IconClose className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-6">
                        <span className="eyebrow me-1">{t.search.popular}</span>
                        {Object.entries(CATEGORIES).map(([key, entry]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setQuery(entry.name[lang])}
                                className="chip"
                            >
                                {entry.name[lang]}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-5 py-10 sm:px-10 sm:py-14">
                <div className="mx-auto max-w-[1600px]">
                    {terms.length === 0 ? (
                        <p className="py-16 text-center text-inksoft">{t.search.start}</p>
                    ) : results.length === 0 ? (
                        <p className="py-16 text-center text-inksoft">{t.search.empty}</p>
                    ) : (
                        <>
                            <p className="mb-8 text-xs text-center text-inksoft" aria-live="polite">
                                {t.filters.results(results.length)}
                            </p>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-8">
                                {results.map((product, index) => (
                                    <Reveal key={product.slug} delay={(index % 4) * 80}>
                                        <ProductCard product={product} onQuickView={setQuick} priority={index < 4} />
                                    </Reveal>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <QuickView product={quick} onClose={() => setQuick(null)} />
        </>
    );
}
