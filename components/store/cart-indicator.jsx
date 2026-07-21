'use client';

import Link from 'next/link';
import { useCart } from './cart-context';

export function CartIndicator() {
    const { totalItems } = useCart();
    return (
        <Link
            href="/store/cart"
            className="relative inline-flex items-center gap-2 px-3 py-2 no-underline"
            aria-label={`Cart with ${totalItems} item${totalItems === 1 ? '' : 's'}`}
        >
            <span className="text-xl leading-none">🛒</span>
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold rounded-full bg-primary text-primary-content">
                    {totalItems}
                </span>
            )}
        </Link>
    );
}
