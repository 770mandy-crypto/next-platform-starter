'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findVariant, LENS_UPGRADES } from '../../data/catalogue';
import { dict, formatPrice, FREE_SHIPPING_THRESHOLD } from '../../lib/shop/i18n';

const SHIPPING_COST = 29;
const PROMO_CODES = { AYIN10: 0.1, HELLO10: 0.1 };

const ShopContext = createContext(null);

function read(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function write(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* storage can be unavailable — the store still works, it just forgets */
    }
}

export function ShopProvider({ children }) {
    const [lang, setLang] = useState('he');
    const [items, setItems] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [promo, setPromo] = useState(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setLang(read('ayin.lang', 'he'));
        setItems(read('ayin.cart', []));
        setWishlist(read('ayin.wishlist', []));
        setPromo(read('ayin.promo', null));
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated) write('ayin.cart', items);
    }, [items, hydrated]);
    useEffect(() => {
        if (hydrated) write('ayin.wishlist', wishlist);
    }, [wishlist, hydrated]);
    useEffect(() => {
        if (hydrated) write('ayin.promo', promo);
    }, [promo, hydrated]);
    useEffect(() => {
        if (hydrated) write('ayin.lang', lang);
        const dir = lang === 'he' ? 'rtl' : 'ltr';
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lang);
    }, [lang, hydrated]);

    useEffect(() => {
        if (!toast) return undefined;
        const id = setTimeout(() => setToast(null), 2600);
        return () => clearTimeout(id);
    }, [toast]);

    useEffect(() => {
        document.body.style.overflow = cartOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [cartOpen]);

    const t = dict[lang];

    const addItem = useCallback((variantId, lensId = 'standard', qty = 1) => {
        setItems((current) => {
            const key = `${variantId}::${lensId}`;
            const existing = current.find((item) => item.key === key);
            if (existing) {
                return current.map((item) => (item.key === key ? { ...item, qty: Math.min(item.qty + qty, 9) } : item));
            }
            return [...current, { key, variantId, lensId, qty }];
        });
        setCartOpen(true);
    }, []);

    const setQty = useCallback((key, qty) => {
        setItems((current) =>
            qty <= 0
                ? current.filter((item) => item.key !== key)
                : current.map((item) => (item.key === key ? { ...item, qty: Math.min(qty, 9) } : item))
        );
    }, []);

    const removeItem = useCallback((key) => {
        setItems((current) => current.filter((item) => item.key !== key));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setPromo(null);
    }, []);

    const toggleWish = useCallback((slug) => {
        setWishlist((current) => (current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]));
    }, []);

    const applyPromo = useCallback((code) => {
        const normalised = String(code || '').trim().toUpperCase();
        if (PROMO_CODES[normalised]) {
            setPromo(normalised);
            return true;
        }
        return false;
    }, []);

    const lines = useMemo(
        () =>
            items
                .map((item) => {
                    const found = findVariant(item.variantId);
                    if (!found) return null;
                    const lens = LENS_UPGRADES.find((l) => l.id === item.lensId) ?? LENS_UPGRADES[0];
                    const unit = found.product.price + lens.price;
                    return { ...item, product: found.product, variant: found.variant, lens, unit, total: unit * item.qty };
                })
                .filter(Boolean),
        [items]
    );

    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const discount = promo ? Math.round(subtotal * PROMO_CODES[promo]) : 0;
    const shipping = subtotal === 0 || subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal - discount + shipping;
    const count = lines.reduce((sum, line) => sum + line.qty, 0);

    const value = {
        lang,
        setLang,
        t,
        dir: lang === 'he' ? 'rtl' : 'ltr',
        price: (ils) => formatPrice(ils, lang),
        hydrated,
        items: lines,
        count,
        subtotal,
        discount,
        shipping,
        total,
        promo,
        applyPromo,
        clearPromo: () => setPromo(null),
        addItem,
        setQty,
        removeItem,
        clearCart,
        wishlist,
        toggleWish,
        cartOpen,
        setCartOpen,
        toast,
        setToast,
        freeShippingRemaining: Math.max(0, FREE_SHIPPING_THRESHOLD - (subtotal - discount)),
        freeShippingProgress: Math.min(1, (subtotal - discount) / FREE_SHIPPING_THRESHOLD)
    };

    return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
    const context = useContext(ShopContext);
    if (!context) throw new Error('useShop must be used inside ShopProvider');
    return context;
}
