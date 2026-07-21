'use client';

import { useState } from 'react';
import { useCart } from './cart-context';

export function AddToCartButton({ product, quantity = 1, compact = false }) {
    const { addItem } = useCart();
    const [added, setAdded] = useState(false);

    function handleClick() {
        addItem(product, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            className={['btn', compact ? '' : 'btn-lg sm:min-w-64'].filter(Boolean).join(' ')}
        >
            {added ? 'Added ✓' : compact ? 'Add' : 'Add to cart'}
        </button>
    );
}
