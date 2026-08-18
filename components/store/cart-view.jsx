'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { GarmentShot } from 'components/store/garment-shot';
import { useCart } from 'components/store/cart-provider';
import { startCheckout } from 'lib/actions';
import { cartLineKey, formatPrice } from 'lib/format';

const FREE_SHIPPING_THRESHOLD = 350;
const SHIPPING_COST = 29;

export function CartView() {
    const { lines, setQuantity, removeLine, subtotal, hydrated } = useCart();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState(null);

    if (!hydrated) {
        return <p className="mt-10 text-muted">טוען את העגלה…</p>;
    }

    if (!lines.length) {
        return (
            <div className="mt-10">
                <p className="text-muted">העגלה שלך ריקה כרגע.</p>
                <Link href="/shop" className="inline-flex mt-8 btn-gold">
                    לקולקציה
                </Link>
            </div>
        );
    }

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shipping;
    const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

    function handleCheckout() {
        setMessage(null);
        startTransition(async () => {
            const result = await startCheckout(
                lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }))
            );
            if (result.ok) {
                window.location.href = result.checkoutUrl;
            } else {
                setMessage(result.message);
            }
        });
    }

    return (
        <div className="mt-10">
            <ul className="flex flex-col">
                {lines.map((line) => {
                    const key = cartLineKey(line);
                    return (
                        <li key={key} className="flex gap-6 py-8 border-b hairline first:border-t">
                            <Link href={`/product/${line.slug}`} className="shrink-0">
                                <div
                                    className="w-24 overflow-hidden border sm:w-28 hairline"
                                    style={{ aspectRatio: '3 / 4' }}
                                >
                                    <GarmentShot product={line} className="w-full h-full" />
                                </div>
                            </Link>

                            <div className="flex flex-col grow">
                                <div className="flex flex-wrap items-baseline justify-between gap-3">
                                    <Link
                                        href={`/product/${line.slug}`}
                                        className="text-sm tracking-[0.14em] uppercase transition-colors hover:text-gold"
                                        style={{ fontFamily: 'var(--font-display)' }}
                                    >
                                        {line.title}
                                    </Link>
                                    <span className="text-sm text-gold tabular-nums">
                                        {formatPrice(line.price * line.quantity)}
                                    </span>
                                </div>

                                <p className="mt-2 text-xs tracking-[0.12em] uppercase text-muted">
                                    מידה {line.size}
                                    {line.color ? ` · ${line.color}` : ''}
                                </p>

                                <div className="flex items-center gap-6 pt-5 mt-auto">
                                    <div className="flex items-center border hairline">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(key, line.quantity - 1)}
                                            aria-label={`הפחת כמות של ${line.title}`}
                                            className="px-4 py-2 leading-none transition-colors cursor-pointer hover:text-gold"
                                        >
                                            −
                                        </button>
                                        <span className="w-7 text-sm text-center tabular-nums">{line.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(key, line.quantity + 1)}
                                            aria-label={`הוסף כמות של ${line.title}`}
                                            className="px-4 py-2 leading-none transition-colors cursor-pointer hover:text-gold"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeLine(key)}
                                        className="text-xs tracking-[0.16em] uppercase transition-colors cursor-pointer text-muted hover:text-gold"
                                    >
                                        הסרה
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="p-8 mt-12 border hairline" style={{ background: 'var(--color-ink-2)' }}>
                <dl className="flex flex-col gap-3 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-muted">סכום ביניים</dt>
                        <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted">משלוח</dt>
                        <dd className="tabular-nums">{shipping === 0 ? 'חינם' : formatPrice(shipping)}</dd>
                    </div>
                    <div className="flex justify-between pt-4 mt-2 text-base border-t hairline">
                        <dt className="tracking-[0.14em] uppercase">סה״כ</dt>
                        <dd className="text-gold tabular-nums">{formatPrice(total)}</dd>
                    </div>
                </dl>

                {shipping > 0 && (
                    <div className="mt-6">
                        <p className="text-xs tracking-[0.12em] uppercase text-gold">
                            עוד {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} למשלוח חינם
                        </p>
                        <div className="h-px mt-3 overflow-hidden" style={{ background: 'var(--color-hairline)' }}>
                            <div
                                className="h-full transition-all duration-700 ease-out"
                                style={{ width: `${progress}%`, background: 'var(--color-gold)' }}
                            />
                        </div>
                    </div>
                )}

                <button type="button" onClick={handleCheckout} disabled={pending} className="w-full mt-8 btn-gold">
                    {pending ? 'רגע…' : 'מעבר לתשלום'}
                </button>

                <p aria-live="polite" className="mt-4 text-sm text-muted">
                    {message}
                </p>
            </div>
        </div>
    );
}
