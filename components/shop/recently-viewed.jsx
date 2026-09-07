'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getProduct } from '../../data/catalogue';
import { useRecentlyViewed } from '../../lib/shop/recently-viewed';
import { useShop } from './providers';

export function RecentlyViewed({ currentSlug = null }) {
    const { t, lang, price } = useShop();
    const items = useRecentlyViewed(currentSlug)
        .map((slug) => getProduct(slug))
        .filter(Boolean)
        .slice(0, 6);

    if (items.length === 0) return null;

    return (
        <section className="px-5 py-16 border-t sm:px-10 hairline">
            <div className="mx-auto max-w-[1600px]">
                <p className="mb-1 eyebrow">{t.sections.recent}</p>
                <p className="mb-8 text-xs text-inksoft">{t.sections.recentSub}</p>
                <ul className="flex gap-4 pb-2 overflow-x-auto scrollbar-hidden">
                    {items.map((product) => (
                        <li key={product.slug} className="w-40 shrink-0 sm:w-48">
                            <Link href={`/product/${product.slug}`} className="block group">
                                <div className="relative overflow-hidden border rounded-none bg-bone aspect-square hairline">
                                    <Image
                                        src={product.variants[0].image}
                                        alt={product.name[lang]}
                                        fill
                                        sizes="200px"
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                </div>
                                <p className="mt-3 text-sm">{product.name[lang]}</p>
                                <p className="text-xs text-inksoft">{price(product.price)}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
