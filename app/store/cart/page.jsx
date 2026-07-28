'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from 'components/store/cart-context';
import { ProductThumbnail, formatPrice } from 'components/store/product-thumbnail';

export default function CartPage() {
    const { items, totalItems, totalPrice, setQuantity, removeItem, clearCart } = useCart();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleCheckout() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map((item) => ({ slug: item.slug, quantity: item.quantity }))
                })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'Checkout failed');
            }

            if (data.url) {
                // Stripe is configured: hand off to Stripe Checkout.
                window.location.href = data.url;
                return;
            }

            // Demo mode (no Stripe keys): show a local confirmation.
            setOrder({
                id: `YC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                total: totalPrice
            });
            clearCart();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (order) {
        return (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
                <div className="text-6xl">🎉</div>
                <h1>Order confirmed</h1>
                <p className="max-w-md text-lg text-neutral-300">
                    Thanks! Your order <span className="font-mono text-primary">{order.id}</span> for{' '}
                    <strong>{formatPrice(order.total)}</strong> has been placed. Your download links are on their way.
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
                        <span>Delivery</span>
                        <span>Instant download</span>
                    </div>
                    <div className="flex justify-between pt-3 text-lg font-bold border-t border-neutral-200 text-neutral-900">
                        <span>Total</span>
                        <span>{formatPrice(totalPrice)}</span>
                    </div>

                    <button type="button" onClick={handleCheckout} disabled={loading} className="mt-2 btn btn-lg">
                        {loading ? 'Redirecting…' : `Checkout · ${formatPrice(totalPrice)}`}
                    </button>
                    {error && <p className="text-sm text-center text-red-500">{error}</p>}
                    <p className="text-xs text-center text-neutral-400">
                        🔒 Secure checkout powered by Stripe · 🚚 Free shipping
                    </p>
                    <p className="text-xs font-medium text-center text-green-600">
                        ↩️ 30-day money-back guarantee
                    </p>
                </aside>
            </div>
        </div>
    );
}
