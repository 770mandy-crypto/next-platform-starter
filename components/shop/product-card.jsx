'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useShop } from './providers';
import { IconHeart } from './icons';

export function ProductCard({ product, onQuickView, priority = false }) {
    const { lang, t, price, wishlist, toggleWish } = useShop();
    const [active, setActive] = useState(0);
    const variant = product.variants[active];
    const wished = wishlist.includes(product.slug);
    const hoverImage = product.variants[(active + 1) % product.variants.length]?.image;

    return (
        <article className="group card-ayin">
            <div className="relative overflow-hidden border-b bg-bone aspect-[4/5] hairline">
                <Link href={`/product/${product.slug}`} className="block w-full h-full">
                    <Image
                        key={variant.id}
                        src={variant.image}
                        alt={`${product.name[lang]} — ${variant.color[lang]}`}
                        fill
                        priority={priority}
                        sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 30vw"
                        className="object-cover frame-shot"
                    />
                    {product.variants.length > 1 && hoverImage && (
                        <Image
                            src={hoverImage}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 30vw"
                            className="object-cover transition-opacity duration-700 opacity-0 group-hover:opacity-100"
                        />
                    )}
                </Link>

                {product.badge && (
                    <span className="absolute top-4 start-4 px-3 py-1 text-[0.62rem] tracking-[0.18em] uppercase rounded-none bg-paper/90 backdrop-blur">
                        {t.badges[product.badge]}
                    </span>
                )}

                <button
                    type="button"
                    onClick={() => toggleWish(product.slug)}
                    aria-label="wishlist"
                    className="absolute grid w-9 h-9 transition-transform rounded-full top-3 end-3 place-items-center bg-paper/85 backdrop-blur hover:scale-110 active:scale-95"
                >
                    <IconHeart filled={wished} className={`w-[18px] h-[18px] ${wished ? 'text-brass' : 'text-ink'}`} />
                </button>

                {onQuickView && (
                    <div className="absolute inset-x-3 bottom-3 card-veil">
                        <button
                            type="button"
                            onClick={() => onQuickView(product)}
                            className="w-full py-3 text-[0.7rem] tracking-[0.18em] uppercase rounded-none bg-paper/95 backdrop-blur hover:bg-ink hover:text-bone transition-colors"
                        >
                            {t.product.quickView}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                    <Link href={`/product/${product.slug}`}>
                        <h3 className="truncate transition-colors group-hover:text-brass">{product.name[lang]}</h3>
                    </Link>
                    <p className="mt-1 text-xs text-inksoft">{variant.color[lang]}</p>
                </div>
                <div className="text-end shrink-0">
                    <p className="text-sm ticker-digit">{price(product.price)}</p>
                    {product.compareAt && (
                        <p className="text-xs line-through text-inksoft/70 ticker-digit">{price(product.compareAt)}</p>
                    )}
                </div>
            </div>

            {product.variants.length > 1 && (
                <div className="flex gap-2 px-4 pb-4">
                    {product.variants.map((option, index) => (
                        <button
                            key={option.id}
                            type="button"
                            onMouseEnter={() => setActive(index)}
                            onFocus={() => setActive(index)}
                            onClick={() => setActive(index)}
                            aria-label={option.color[lang]}
                            className={`w-4 h-4 rounded-full border transition-all ${
                                index === active ? 'ring-1 ring-offset-2 ring-ink ring-offset-paper' : 'hairline'
                            }`}
                            style={{ background: option.hex }}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}
