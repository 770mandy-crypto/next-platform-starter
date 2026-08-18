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
            image: product.image,
            size,
            color,
            quantity,
            variantId: findVariantId(product, size, color)
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 4000);
    }

    return (
        <div className="flex flex-col gap-6">
            <fieldset>
                <legend className="mb-2 text-sm font-semibold">מידה</legend>
                <div className="flex flex-wrap gap-2">
                    {product.sizes.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setSize(option)}
                            aria-pressed={size === option}
                            className={`min-w-12 px-3 py-2 text-sm transition-colors border rounded-lg cursor-pointer ${
                                size === option
                                    ? 'border-clay bg-clay text-cream'
                                    : 'border-espresso/20 hover:border-espresso/50'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </fieldset>

            {product.colors.length > 0 && (
                <fieldset>
                    <legend className="mb-2 text-sm font-semibold">
                        צבע: <span className="font-normal text-mocha">{color}</span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {product.colors.map((option) => (
                            <button
                                key={option.name}
                                type="button"
                                onClick={() => setColor(option.name)}
                                aria-pressed={color === option.name}
                                aria-label={option.name}
                                title={option.name}
                                className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border rounded-lg cursor-pointer ${
                                    color === option.name
                                        ? 'border-clay bg-clay/10'
                                        : 'border-espresso/20 hover:border-espresso/50'
                                }`}
                            >
                                {option.hex && (
                                    <span
                                        aria-hidden="true"
                                        className="w-4 h-4 border rounded-full border-espresso/20"
                                        style={{ backgroundColor: option.hex }}
                                    />
                                )}
                                {option.name}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center border rounded-full border-espresso/20">
                    <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        aria-label="הפחת כמות"
                        className="px-4 py-2 text-lg leading-none cursor-pointer"
                    >
                        −
                    </button>
                    <span className="w-8 text-sm text-center" aria-live="polite">
                        {quantity}
                    </span>
                    <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.min(10, current + 1))}
                        aria-label="הוסף כמות"
                        className="px-4 py-2 text-lg leading-none cursor-pointer"
                    >
                        +
                    </button>
                </div>

                <button type="button" onClick={handleAdd} className="btn-clay grow sm:grow-0 sm:min-w-56">
                    הוספה לעגלה
                </button>
            </div>

            <p aria-live="polite" className="min-h-6 text-sm text-clay">
                {added && (
                    <>
                        נוסף לעגלה.{' '}
                        <Link href="/cart" className="font-semibold underline underline-offset-4">
                            למעבר לעגלה
                        </Link>
                    </>
                )}
            </p>
        </div>
    );
}
