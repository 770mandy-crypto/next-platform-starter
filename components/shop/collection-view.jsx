'use client';

import { useMemo, useState } from 'react';
import { products, CATEGORIES, COLOUR_FAMILIES } from '../../data/catalogue';
import { useShop } from './providers';
import { ProductCard } from './product-card';
import { QuickView } from './quick-view';
import { Reveal } from './reveal';
import { Newsletter } from './footer';

const PRICE_BANDS = [
    { id: 'under200', label: { he: 'עד 200 ₪', en: 'Under $55' }, test: (p) => p.price < 200 },
    { id: 'mid', label: { he: '200–400 ₪', en: '$55–$110' }, test: (p) => p.price >= 200 && p.price <= 400 },
    { id: 'over400', label: { he: 'מעל 400 ₪', en: 'Over $110' }, test: (p) => p.price > 400 }
];

function Chip({ active, children, ...rest }) {
    return (
        <button
            type="button"
            className={`px-4 py-2 text-xs tracking-[0.1em] uppercase rounded-full border transition-all ${
                active ? 'bg-ink text-bone border-ink' : 'hairline hover:border-ink/40'
            }`}
            {...rest}
        >
            {children}
        </button>
    );
}

export function CollectionView() {
    const { t, lang } = useShop();
    const [category, setCategory] = useState(null);
    const [band, setBand] = useState(null);
    const [colour, setColour] = useState(null);
    const [sort, setSort] = useState('featured');
    const [quick, setQuick] = useState(null);

    const filtered = useMemo(() => {
        let list = products.filter((product) => {
            if (category && product.category !== category) return false;
            if (band && !PRICE_BANDS.find((b) => b.id === band).test(product)) return false;
            if (colour && !product.variants.some((v) => COLOUR_FAMILIES[colour].match(v))) return false;
            return true;
        });
        if (sort === 'priceAsc') list = [...list].sort((a, b) => a.price - b.price);
        if (sort === 'priceDesc') list = [...list].sort((a, b) => b.price - a.price);
        if (sort === 'new') list = [...list].sort((a, b) => Number(b.badge === 'new') - Number(a.badge === 'new'));
        return list;
    }, [category, band, colour, sort]);

    const dirty = category || band || colour;

    return (
        <>
            <section className="px-5 pt-14 pb-8 sm:px-10 sm:pt-20">
                <div className="mx-auto max-w-[1600px]">
                    <p className="mb-4 eyebrow animate-in-up">AYIN 2026</p>
                    <h1 className="mb-4 max-w-3xl">{t.sections.all}</h1>
                    <p className="max-w-md text-inksoft">{t.sections.allSub}</p>
                </div>
            </section>

            <section className="sticky z-30 px-5 py-4 border-y top-[57px] sm:px-10 hairline bg-paper/90 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-2 mx-auto max-w-[1600px]">
                    <span className="eyebrow me-2 hidden sm:inline">{t.filters.category}</span>
                    {Object.entries(CATEGORIES).map(([key, entry]) => (
                        <Chip
                            key={key}
                            active={category === key}
                            onClick={() => setCategory(category === key ? null : key)}
                        >
                            {entry.name[lang]}
                        </Chip>
                    ))}

                    <span className="w-px h-6 mx-2 bg-line hidden lg:block" />

                    {Object.entries(COLOUR_FAMILIES).map(([key, family]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setColour(colour === key ? null : key)}
                            aria-label={family[lang]}
                            title={family[lang]}
                            className={`w-7 h-7 rounded-full border transition-all ${
                                colour === key ? 'ring-1 ring-offset-2 ring-ink ring-offset-paper' : 'hairline hover:scale-110'
                            }`}
                            style={{ background: family.hex }}
                        />
                    ))}

                    <span className="w-px h-6 mx-2 bg-line hidden lg:block" />

                    {PRICE_BANDS.map((item) => (
                        <Chip key={item.id} active={band === item.id} onClick={() => setBand(band === item.id ? null : item.id)}>
                            {item.label[lang]}
                        </Chip>
                    ))}

                    <div className="flex items-center gap-3 ms-auto">
                        {dirty && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCategory(null);
                                    setBand(null);
                                    setColour(null);
                                }}
                                className="text-xs underline text-inksoft underline-offset-4 hover:text-ink"
                            >
                                {t.filters.clear}
                            </button>
                        )}
                        <span className="text-xs text-inksoft ticker-digit">{t.filters.results(filtered.length)}</span>
                        <select
                            value={sort}
                            onChange={(event) => setSort(event.target.value)}
                            className="px-3 py-2 text-xs bg-transparent border rounded-full hairline focus:outline-none"
                        >
                            {Object.entries(t.filters.sortOptions).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            <section className="px-5 py-12 sm:px-10 sm:py-16">
                <div className="mx-auto max-w-[1600px]">
                    {filtered.length === 0 ? (
                        <p className="py-24 text-center text-inksoft">{t.filters.none}</p>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-8">
                            {filtered.map((product, index) => (
                                <Reveal key={product.slug} delay={(index % 4) * 80}>
                                    <ProductCard product={product} onQuickView={setQuick} priority={index < 4} />
                                </Reveal>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <Newsletter />
            <QuickView product={quick} onClose={() => setQuick(null)} />
        </>
    );
}
