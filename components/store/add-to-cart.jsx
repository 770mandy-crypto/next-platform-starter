'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from 'components/store/cart-provider';

/*
Resolve the Shopify variant that matches the chosen size and colour. Products
served from the local catalog have no variants, in which case the cart line simply
carries no variant id and checkout falls back to a contact-us message.
*/
function findVariantId(product, size, color) {
    if (!product.variants?.length) return null;

    const matches = (variant) =>
        Object.entries(variant.options).every(([name, value]) => {
            const key = name.toLowerCase();
            if (key.includes('size') || key.includes('מידה')) return value === size;
            if (key.includes('color') || key.includes('colour') || key.includes('צבע')) return value === color;
            return true;
        });

    return product.variants.find(matches)?.id ?? product.variants[0].id;
}

export function AddToCart({ product }) {
    const { addLine } = useCart();
    const [size, setSize] = useState(product.sizes[0]);
    const [color, setColor] = useState(product.colors[0]?.name ?? '');
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    function handleAdd() {
        addLine({
            slug: product.slug,
            title: product.title,
            price: product.price,
            cut: product.cut,
            tone: product.tone,
            photo: product.photo ?? null,
            size,
            color,
            quantity,
            variantId: findVariantId(product, size, color)
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 4000);
    }

    return (
        <div className="flex flex-col gap-8">
            <fieldset>
                <legend className="mb-4 text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">
                    מידה
                </legend>
                <div className="flex flex-wrap gap-3">
                    {product.sizes.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setSize(option)}
                            aria-pressed={size === option}
                            className="min-w-14 px-4 py-3 text-xs tracking-[0.14em] uppercase transition-all duration-300 border cursor-pointer"
                            style={
                                size === option
                                    ? {
                                          borderColor: 'var(--color-gold)',
                                          background: 'var(--color-gold)',
                                          color: 'var(--color-ink)'
                                      }
                                    : { borderColor: 'var(--color-hairline)', color: 'var(--color-bone)' }
                            }
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </fieldset>

            {product.colors.length > 1 && (
                <fieldset>
                    <legend className="mb-4 text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">
                        צבע — <span className="text-muted">{color}</span>
                    </legend>
                    <div className="flex flex-wrap gap-3">
                        {product.colors.map((option) => (
                            <button
                                key={option.name}
                                type="button"
                                onClick={() => setColor(option.name)}
                                aria-pressed={color === option.name}
                                title={option.name}
                                className="flex items-center gap-3 px-4 py-3 text-xs transition-all duration-300 border cursor-pointer"
                                style={{
                                    borderColor:
                                        color === option.name ? 'var(--color-gold)' : 'var(--color-hairline)',
                                    color: 'var(--color-bone)'
                                }}
                            >
                                {option.hex && (
                                    <span
                                        aria-hidden="true"
                                        className="w-4 h-4 border"
                                        style={{
                                            backgroundColor: option.hex,
                                            borderColor: 'var(--color-hairline)'
                                        }}
                                    />
                                )}
                                {option.name}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            <div className="flex flex-wrap items-stretch gap-4">
                <div className="flex items-center border hairline">
                    <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        aria-label="הפחת כמות"
                        className="px-5 py-4 text-lg leading-none transition-colors cursor-pointer hover:text-gold"
                    >
                        −
                    </button>
                    <span className="w-8 text-sm text-center tabular-nums" aria-live="polite">
                        {quantity}
                    </span>
                    <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.min(10, current + 1))}
                        aria-label="הוסף כמות"
                        className="px-5 py-4 text-lg leading-none transition-colors cursor-pointer hover:text-gold"
                    >
                        +
                    </button>
                </div>

                <button type="button" onClick={handleAdd} className="btn-gold grow sm:grow-0 sm:min-w-64">
                    הוספה לעגלה
                </button>
            </div>

            <p aria-live="polite" className="min-h-6 text-sm text-gold">
                {added && (
                    <>
                        נוסף לעגלה.{' '}
                        <Link href="/cart" className="border-b" style={{ borderColor: 'var(--color-gold)' }}>
                            למעבר לעגלה
                        </Link>
                    </>
                )}
            </p>
        </div>
    );
}
