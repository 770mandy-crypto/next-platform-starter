'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cartLineKey } from 'lib/format';

const STORAGE_KEY = 'maya-boutique-cart';

const CartContext = createContext(null);

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used inside <CartProvider>');
    }
    return context;
}

export function CartProvider({ children }) {
    const [lines, setLines] = useState([]);
    // The cart is restored from localStorage after mount, so the server-rendered
    // markup and the first client render stay identical.
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setLines(parsed);
                }
            }
        } catch {
            // A corrupt or unavailable store just means we start with an empty cart.
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
        } catch {
            // Ignore quota or private-mode failures — the cart still works in memory.
        }
    }, [lines, hydrated]);

    const value = useMemo(() => {
        function addLine(line) {
            const key = cartLineKey(line);
            setLines((current) => {
                const existing = current.find((candidate) => cartLineKey(candidate) === key);
                if (existing) {
                    return current.map((candidate) =>
                        cartLineKey(candidate) === key
                            ? { ...candidate, quantity: candidate.quantity + line.quantity }
                            : candidate
                    );
                }
                return [...current, line];
            });
        }

        function setQuantity(key, quantity) {
            setLines((current) =>
                quantity <= 0
                    ? current.filter((candidate) => cartLineKey(candidate) !== key)
                    : current.map((candidate) =>
                          cartLineKey(candidate) === key ? { ...candidate, quantity } : candidate
                      )
            );
        }

        function removeLine(key) {
            setLines((current) => current.filter((candidate) => cartLineKey(candidate) !== key));
        }

        const count = lines.reduce((total, line) => total + line.quantity, 0);
        const subtotal = lines.reduce((total, line) => total + line.price * line.quantity, 0);

        return { lines, addLine, setQuantity, removeLine, clear: () => setLines([]), count, subtotal, hydrated };
    }, [lines, hydrated]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
