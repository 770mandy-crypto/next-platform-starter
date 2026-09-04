'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useShop } from './providers';

export function CheckoutDone() {
    const { t, clearCart } = useShop();

    // Stripe sent the shopper back after a completed payment, so the bag that
    // produced the order is no longer current.
    useEffect(() => {
        clearCart();
    }, [clearCart]);

    return (
        <section className="px-5 py-32 text-center sm:px-10">
            <div className="max-w-lg mx-auto animate-in-up">
                <div className="grid w-16 h-16 mx-auto mb-8 rounded-full place-items-center bg-ink text-bone">✓</div>
                <h1 className="mb-4 text-[clamp(2rem,5vw,3rem)]">{t.checkout.done}</h1>
                <p className="mb-10 text-inksoft">{t.checkout.doneBody}</p>
                <Link href="/collection" className="btn-ayin">
                    <span>{t.cart.continue}</span>
                </Link>
            </div>
        </section>
    );
}
