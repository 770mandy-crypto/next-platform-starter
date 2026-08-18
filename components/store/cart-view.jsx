'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { startCheckout } from 'lib/actions';
import { useCart } from 'components/store/cart-provider';
import { cartLineKey, formatPrice } from 'lib/format';

const FREE_SHIPPING_THRESHOLD = 350;
const SHIPPING_COST = 29;

export function CartView() {
    const { lines, setQuantity, removeLine, subtotal, hydrated } = useCart();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState(null);

    if (!hydrated) {
        return <p className="mt-8 text-mocha">טוען את העגלה…</p>;
    }

    if (!lines.length) {
        return (
            <div className="mt-8">
                <p className="text-mocha">העגלה שלך ריקה כרגע.</p>
                <Link href="/shop" className="mt-6 btn-clay">
                    לצפייה בקולקציה
                </Link>
            </div>
        );
    }

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shipping;

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
        <div className="mt-8">
            <ul className="flex flex-col divide-y divide-espresso/10">
                {lines.map((line) => {
                    const key = cartLineKey(line);
                    return (
                        <li key={key} className="flex gap-4 py-6">
                            <Link href={`/product/${line.slug}`} className="shrink-0">
                                <img
                                    src={line.image}
                                    alt={line.title}
                                    className="object-cover w-20 rounded-lg sm:w-24 aspect-[3/4] bg-sand"
                                />
                            </Link>

                            <div className="flex flex-col grow">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <Link href={`/product/${line.slug}`} className="font-display">
                                        {line.title}
                                    </Link>
                                    <span className="text-sm font-semibold">
                                        {formatPrice(line.price * line.quantity)}
                                    </span>
                                </div>

                                <p className="mt-1 text-sm text-mocha">
                                    מידה {line.size}
                                    {line.color ? ` · ${line.color}` : ''}
                                </p>

                                <div className="flex items-center gap-4 mt-auto pt-3">
                                    <div className="flex items-center border rounded-full border-espresso/20">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(key, line.quantity - 1)}
                                            aria-label={`הפחת כמות של ${line.title}`}
                                            className="px-3 py-1 text-lg leading-none cursor-pointer"
                                        >
                                            −
                                        </button>
                                        <span className="w-7 text-sm text-center">{line.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(key, line.quantity + 1)}
                                            aria-label={`הוסף כמות של ${line.title}`}
                                            className="px-3 py-1 text-lg leading-none cursor-pointer"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeLine(key)}
                                        className="text-sm cursor-pointer text-mocha hover:text-clay"
                                    >
                                        הסרה
                                    </button>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="p-6 mt-8 rounded-xl bg-sand/70">
                <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-mocha">סכום ביניים</dt>
                        <dd>{formatPrice(subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-mocha">משלוח</dt>
                        <dd>{shipping === 0 ? 'חינם' : formatPrice(shipping)}</dd>
                    </div>
                    <div className="flex justify-between pt-3 mt-2 text-base font-semibold border-t border-espresso/10">
                        <dt>סה״כ לתשלום</dt>
                        <dd>{formatPrice(total)}</dd>
                    </div>
                </dl>

                {shipping > 0 && (
                    <p className="mt-3 text-sm text-clay">
                        עוד {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} ומקבלים משלוח חינם.
                    </p>
                )}

                <button type="button" onClick={handleCheckout} disabled={pending} className="w-full mt-6 btn-clay">
                    {pending ? 'רגע…' : 'מעבר לתשלום'}
                </button>

                <p aria-live="polite" className="mt-3 text-sm text-mocha">
                    {message}
                </p>
            </div>
        </div>
    );
}
