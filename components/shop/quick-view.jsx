'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useShop } from './providers';
import { useDialog } from '../../lib/shop/use-dialog';
import { SpinViewer } from './spin-viewer';
import { IconClose } from './icons';
import { CATEGORIES } from '../../data/catalogue';

export function QuickView({ product, onClose }) {
    const { lang, t, price, addItem } = useShop();
    const [index, setIndex] = useState(0);
    const panelRef = useDialog(Boolean(product), onClose);

    useEffect(() => {
        setIndex(0);
    }, [product]);

    useEffect(() => {
        document.body.style.overflow = product ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [product]);

    if (!product) return null;
    const variant = product.variants[index];

    return (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm animate-in-up"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={product.name[lang]}
                tabIndex={-1}
                className="relative w-full max-w-4xl overflow-hidden shadow-2xl outline-none rounded-none bg-paper animate-in-up"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute z-10 grid w-10 h-10 top-4 end-4 place-items-center bg-bone/90 backdrop-blur hover:rotate-90 transition-transform duration-300"
                >
                    <IconClose className="w-5 h-5" />
                </button>

                <div className="grid md:grid-cols-2">
                    <div className="p-6 bg-plate">
                        <SpinViewer src={variant.image} alt={product.name[lang]} label={t.product.spin} />
                    </div>

                    <div className="flex flex-col p-7 sm:p-9">
                        <p className="eyebrow mb-3">{CATEGORIES[product.category].name[lang]}</p>
                        <h3 className="display text-3xl mb-2">{product.name[lang]}</h3>
                        <p className="mb-4 text-sm text-inksoft">{product.tagline[lang]}</p>

                        <p className="mb-6 text-sm leading-relaxed text-inksoft line-clamp-4">{product.story[lang]}</p>

                        {product.variants.length > 1 && (
                            <div className="mb-6">
                                <p className="mb-2 eyebrow">{t.product.color}</p>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map((option, i) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setIndex(i)}
                                            aria-label={option.color[lang]}
                                            className={`w-7 h-7 rounded-full border transition-all ${
                                                i === index
                                                    ? 'ring-1 ring-offset-2 ring-ink ring-offset-paper'
                                                    : 'hairline hover:scale-110'
                                            }`}
                                            style={{ background: option.hex }}
                                        />
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-inksoft">{variant.color[lang]}</p>
                            </div>
                        )}

                        <div className="flex items-baseline gap-3 mt-auto mb-5">
                            <span className="display text-2xl ticker-digit">{price(product.price)}</span>
                            {product.compareAt && (
                                <span className="text-sm line-through text-inksoft/70 ticker-digit">
                                    {price(product.compareAt)}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => {
                                    addItem(variant.id);
                                    onClose();
                                }}
                                className="flex-1 btn-ayin"
                            >
                                <span>{t.product.addToCart}</span>
                            </button>
                            <Link href={`/product/${product.slug}`} className="btn-ayin btn-ghost">
                                <span>{t.product.details}</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
