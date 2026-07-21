'use client';

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'ycommerce-cart';

function reducer(state, action) {
    switch (action.type) {
        case 'hydrate':
            return action.items;
        case 'add': {
            const existing = state.find((item) => item.slug === action.product.slug);
            if (existing) {
                return state.map((item) =>
                    item.slug === action.product.slug ? { ...item, quantity: item.quantity + action.quantity } : item
                );
            }
            return [
                ...state,
                {
                    slug: action.product.slug,
                    name: action.product.name,
                    price: action.product.price,
                    emoji: action.product.emoji,
                    gradient: action.product.gradient,
                    quantity: action.quantity
                }
            ];
        }
        case 'setQuantity':
            return state
                .map((item) => (item.slug === action.slug ? { ...item, quantity: action.quantity } : item))
                .filter((item) => item.quantity > 0);
        case 'remove':
            return state.filter((item) => item.slug !== action.slug);
        case 'clear':
            return [];
        default:
            return state;
    }
}

export function CartProvider({ children }) {
    const [items, dispatch] = useReducer(reducer, []);

    // Hydrate from localStorage once on mount.
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                dispatch({ type: 'hydrate', items: JSON.parse(stored) });
            }
        } catch {
            // Ignore malformed storage.
        }
    }, []);

    // Persist on every change.
    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Storage may be unavailable (private mode); fail silently.
        }
    }, [items]);

    const value = useMemo(() => {
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        return {
            items,
            totalItems,
            totalPrice,
            addItem: (product, quantity = 1) => dispatch({ type: 'add', product, quantity }),
            setQuantity: (slug, quantity) => dispatch({ type: 'setQuantity', slug, quantity }),
            removeItem: (slug) => dispatch({ type: 'remove', slug }),
            clearCart: () => dispatch({ type: 'clear' })
        };
    }, [items]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
