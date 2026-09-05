'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'am-cart-v1';

export function lineKey(line) {
  return `${line.slug}::${line.size}`;
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Cart lives in the browser only — it's a shopping list, not an order. The
  // order itself is created server-side at checkout, against real stock.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore corrupt/inaccessible storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // ignore quota/private-mode errors
    }
  }, [lines, hydrated]);

  const addLine = useCallback((line) => {
    setLines((prev) => {
      const key = lineKey(line);
      const existing = prev.find((l) => lineKey(l) === key);
      if (existing) {
        return prev.map((l) =>
          lineKey(l) === key ? { ...l, quantity: Math.min(l.maxQuantity ?? 20, l.quantity + line.quantity) } : l
        );
      }
      return [...prev, line];
    });
    setDrawerOpen(true);
  }, []);

  const removeLine = useCallback((key) => {
    setLines((prev) => prev.filter((l) => lineKey(l) !== key));
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setLines((prev) =>
      prev.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.max(1, Math.min(l.maxQuantity ?? 20, quantity)) } : l))
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.quantity * l.price, 0), [lines]);

  const value = useMemo(
    () => ({ lines, addLine, removeLine, setQuantity, clear, count, subtotal, drawerOpen, setDrawerOpen, hydrated }),
    [lines, addLine, removeLine, setQuantity, clear, count, subtotal, drawerOpen, hydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
