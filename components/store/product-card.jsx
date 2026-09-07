'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES, inStock } from '../../data/catalogue';
import { useStore } from '../../lib/store/context';
import { IconHeart } from './icons';

const LOW_STOCK = 5;

export function ProductCard({ product, priority = false, sizes = '(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw' }) {
    const { t, lang, price, add, saved, toggleSave } = useStore();
    const isSaved = saved.includes(product.slug);
    const available = inStock(product);
    const low = available && product.stock <= LOW_STOCK;

    return (
        <article className="group card">
            <div className="relative overflow-hidden bg-card aspect-[4/5]">
                <Link href={`/p/${product.slug}`} className="block w-full h-full" aria-label={product.name[lang]}>
                    <Image
                        src={product.image}
                        alt={product.name[lang]}
                        fill
                        priority={priority}
                        sizes={sizes}
                        className="object-cover shot shot-front"
                    />
                    {/* the same photograph, held a touch closer, as the hover state */}
                    <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes={sizes}
                        className="object-cover scale-110 opacity-0 shot shot-back"
                    />
                </Link>

                {(product.badge || !available) && (
                    <span className="absolute px-3 py-1 top-3 start-3 bg-canvas text-[0.6rem] tracking-[0.16em] uppercase">
                        {available ? t.badges[product.badge] : t.listing.soldOut}
                    </span>
                )}

                <button
                    type="button"
                    onClick={() => toggleSave(product.slug)}
                    aria-label={isSaved ? t.product.saved : t.product.save}
                    aria-pressed={isSaved}
                    className="absolute grid w-9 h-9 top-2.5 end-2.5 place-items-center hover:scale-110 transition-transform"
                >
                    <IconHeart filled={isSaved} className={`w-[18px] h-[18px] ${isSaved ? 'text-clay' : 'text-ink'}`} />
                </button>

                {available && (
                    <div className="absolute inset-x-3 bottom-3 quick">
                        <button type="button" onClick={() => add(product)} className="justify-center w-full btn btn-sm">
                            {t.product.add}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-start justify-between gap-3 pt-3">
                <div className="min-w-0">
                    <Link href={`/p/${product.slug}`}>
                        <h3 className="truncate">{product.name[lang]}</h3>
                    </Link>
                    <p className="mt-1 text-xs text-mute">{CATEGORIES[product.category].name[lang]}</p>
                </div>
                <div className="text-end shrink-0">
                    <p className="text-sm ticker">{price(product.price)}</p>
                    {product.compareAt && (
                        <p className="text-xs line-through ticker text-mute">{price(product.compareAt)}</p>
                    )}
                </div>
            </div>

            {low && <p className="mt-1 text-[0.68rem] text-clay">{t.listing.lastOnes(product.stock)}</p>}
        </article>
    );
}
