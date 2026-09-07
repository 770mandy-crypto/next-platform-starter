'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getProduct } from '../../data/catalogue';
import { useShop } from './providers';
import { ProductCard } from './product-card';
import { QuickView } from './quick-view';
import { Reveal } from './reveal';
import { IconArrow } from './icons';

export function WishlistView() {
    const { t, wishlist, toggleWish } = useShop();
    const [quick, setQuick] = useState(null);
    // A slug can disappear from the catalogue after it was saved.
    const saved = wishlist.map((slug) => getProduct(slug)).filter(Boolean);

    return (
        <>
            <section className="px-5 pt-14 pb-8 sm:px-10 sm:pt-20">
                <div className="mx-auto max-w-[1600px]">
                    <p className="mb-4 eyebrow animate-in-up">{t.wishlist.count(saved.length)}</p>
                    <h1 className="mb-4">{t.wishlist.title}</h1>
                    <p className="max-w-md text-inksoft">{t.wishlist.sub}</p>
                </div>
            </section>

            <section className="px-5 pb-16 sm:px-10 sm:pb-24">
                <div className="mx-auto max-w-[1600px]">
                    {saved.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="mb-8 text-inksoft">{t.wishlist.empty}</p>
                            <Link href="/collection" className="btn-ayin">
                                <span>{t.wishlist.browse}</span>
                                <IconArrow className="w-4 h-4 rtl:rotate-180" />
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-8">
                                {saved.map((product, index) => (
                                    <Reveal key={product.slug} delay={(index % 4) * 80}>
                                        <ProductCard product={product} onQuickView={setQuick} priority={index < 4} />
                                    </Reveal>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => saved.forEach((product) => toggleWish(product.slug))}
                                className="block mx-auto mt-12 text-sm underline text-inksoft underline-offset-4 hover:text-ink"
                            >
                                {t.wishlist.clear}
                            </button>
                        </>
                    )}
                </div>
            </section>

            <QuickView product={quick} onClose={() => setQuick(null)} />
        </>
    );
}
