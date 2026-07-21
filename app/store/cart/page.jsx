'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from 'components/store/cart-context';
import { ProductThumbnail, formatPrice } from 'components/store/product-thumbnail';

const SHIPPING = 6.0;

export default function CartPage() {
    const { items, totalItems, totalPrice, setQuantity, removeItem, clearCart } = useCart();
    const [order, setOrder] = useState(null);

    function handleCheckout(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        setOrder({
            id: `YC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            name: form.get('name'),
            total: totalPrice + SHIPPING
        });
        clearCart();
    }

    if (order) {
        return (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
                <div className="text-6xl">🎉</div>
                <h1>Order confirmed</h1>
                <p className="max-w-md text-lg text-neutral-300">
                    Thanks{order.name ? `, ${order.name}` : ''}! Your order{' '}
                    <span className="font-mono text-primary">{order.id}</span> for{' '}
                    <strong>{formatPrice(order.total)}</strong> has been placed. A confirmation is on its way.
                </p>
                <Link href="/store" className="btn btn-lg">
                    Continue shopping
                </Link>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
                <div className="text-6xl">🛒</div>
                <h1>Your cart is empty</h1>
                <p className="text-lg text-neutral-300">Looks like you haven&apos;t added anything yet.</p>
                <Link href="/store" className="btn btn-lg">
                    Browse the shop
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <h1>Your cart</h1>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
                {/* Line items */}
                <section className="flex flex-col gap-4">
                    {items.map((item) => (
                        <div
                            key={item.slug}
                            className="flex items-center gap-4 px-4 py-4 bg-white rounded-sm text-neutral-700"
                        >
                            <ProductThumbnail
                                emoji={item.emoji}
                                gradient={item.gradient}
                                className="w-20 h-20 shrink-0"
                                size="text-3xl"
                            />
                            <div className="flex-1 min-w-0">
                                <Link href={`/store/${item.slug}`} className="no-underline hover:opacity-80">
                                    <h3 className="truncate text-neutral-900">{item.name}</h3>
                                </Link>
                                <p className="text-sm text-neutral-500">{formatPrice(item.price)} each</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() => setQuantity(item.slug, item.quantity - 1)}
                                    className="flex items-center justify-center w-8 h-8 font-bold rounded-sm bg-neutral-200 text-neutral-800 hover:bg-neutral-300"
                                >
                                    −
                                </button>
                                <span className="w-8 font-semibold text-center text-neutral-900">{item.quantity}</span>
                                <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onClick={() => setQuantity(item.slug, item.quantity + 1)}
                                    className="flex items-center justify-center w-8 h-8 font-bold rounded-sm bg-neutral-200 text-neutral-800 hover:bg-neutral-300"
                                >
                                    +
                                </button>
                            </div>
                            <div className="w-24 font-bold text-right text-neutral-900">
                                {formatPrice(item.price * item.quantity)}
                            </div>
                            <button
                                type="button"
                                aria-label={`Remove ${item.name}`}
                                onClick={() => removeItem(item.slug)}
                                className="text-neutral-400 hover:text-red-500"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={clearCart}
                        className="self-start text-sm text-neutral-400 hover:opacity-80"
                    >
                        Clear cart
                    </button>
                </section>

                {/* Summary + checkout */}
                <aside className="flex flex-col gap-4 px-6 py-6 bg-white rounded-sm text-neutral-700 h-fit">
                    <h2 className="text-neutral-900">Summary</h2>
                    <div className="flex justify-between text-sm">
                        <span>Items ({totalItems})</span>
                        <span>{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>{formatPrice(SHIPPING)}</span>
                    </div>
                    <div className="flex justify-between pt-3 text-lg font-bold border-t border-neutral-200 text-neutral-900">
                        <span>Total</span>
                        <span>{formatPrice(totalPrice + SHIPPING)}</span>
                    </div>

                    <form onSubmit={handleCheckout} className="flex flex-col gap-3 mt-2">
                        <input name="name" required placeholder="Full name" className="input" />
                        <input name="email" type="email" required placeholder="Email" className="input" />
                        <input name="address" required placeholder="Shipping address" className="input" />
                        <button type="submit" className="mt-2 btn btn-lg">
                            Checkout · {formatPrice(totalPrice + SHIPPING)}
                        </button>
                    </form>
                    <p className="text-xs text-center text-neutral-400">
                        Demo checkout — no payment is processed.
                    </p>
                </aside>
            </div>
        </div>
    );
}
