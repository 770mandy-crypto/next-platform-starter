'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProduct, ILS_TO_USD } from '../../data/catalogue';
import { copy, FREE_SHIPPING, PROMOS, SHIPPING } from './copy';

const StoreContext = createContext(null);
const MAX_QTY = 9;

function read(key, fallback) {
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
        /* private mode: the shop still works, it just forgets between visits */
    }
}

export function StoreProvider({ children }) {
    const [lang, setLang] = useState('he');
    const [lines, setLines] = useState([]);
    const [saved, setSaved] = useState([]);
    const [promo, setPromo] = useState(null);
    const [bagOpen, setBagOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setLang(read('maor.lang', 'he'));
        setLines(read('maor.bag', []));
        setSaved(read('maor.saved', []));
        setPromo(read('maor.promo', null));
        setReady(true);
    }, []);

    useEffect(() => {
        if (ready) write('maor.bag', lines);
    }, [lines, ready]);
    useEffect(() => {
        if (ready) write('maor.saved', saved);
    }, [saved, ready]);
    useEffect(() => {
        if (ready) write('maor.promo', promo);
    }, [promo, ready]);
    useEffect(() => {
        if (ready) write('maor.lang', lang);
        document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
    }, [lang, ready]);

    useEffect(() => {
        if (!toast) return undefined;
        const id = setTimeout(() => setToast(null), 2600);
        return () => clearTimeout(id);
    }, [toast]);

    useEffect(() => {
        document.body.style.overflow = bagOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [bagOpen]);

    const t = copy[lang];

    /** Prices live in shekels; English shoppers see an indicative dollar figure. */
    const price = useCallback(
        (ils) =>
            lang === 'he'
                ? `${Math.round(ils).toLocaleString('he-IL')} ₪`
                : `$${Math.round(ils * ILS_TO_USD).toLocaleString('en-US')}`,
        [lang]
    );

    // A saved bag can outlive a product being retired, so unknown ids drop out.
    const detailed = useMemo(
        () =>
            lines
                .map((line) => {
                    const product = getProduct(line.id);
                    return product ? { ...line, product } : null;
                })
                .filter(Boolean),
        [lines]
    );

    const count = detailed.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = detailed.reduce((sum, line) => sum + line.product.price * line.qty, 0);
    const discount = promo ? Math.round(subtotal * (PROMOS[promo] ?? 0)) : 0;
    const shipping = subtotal === 0 || subtotal - discount >= FREE_SHIPPING ? 0 : SHIPPING;
    const total = Math.max(0, subtotal - discount + shipping);

    const add = useCallback((product, qty = 1) => {
        const id = product.slug;
        setLines((current) => {
            const existing = current.find((line) => line.id === id);
            if (existing) {
                return current.map((line) => (line.id === id ? { ...line, qty: Math.min(MAX_QTY, line.qty + qty) } : line));
            }
            return [...current, { id, qty }];
        });
        setToast({ slug: product.slug });
        setBagOpen(true);
    }, []);

    const setQty = useCallback((id, qty) => {
        setLines((current) =>
            qty <= 0
                ? current.filter((line) => line.id !== id)
                : current.map((line) => (line.id === id ? { ...line, qty: Math.min(MAX_QTY, qty) } : line))
        );
    }, []);

    const removeLine = useCallback((id) => setLines((current) => current.filter((line) => line.id !== id)), []);
    const clearBag = useCallback(() => setLines([]), []);

    const toggleSave = useCallback((slug) => {
        setSaved((current) => (current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]));
    }, []);

    const applyPromo = useCallback((code) => {
        const key = String(code || '').trim().toUpperCase();
        if (PROMOS[key]) {
            setPromo(key);
            return true;
        }
        return false;
    }, []);

    const value = {
        lang,
        setLang,
        t,
        price,
        lines: detailed,
        rawLines: lines,
        count,
        subtotal,
        discount,
        shipping,
        total,
        promo,
        applyPromo,
        clearPromo: () => setPromo(null),
        add,
        setQty,
        removeLine,
        clearBag,
        saved,
        toggleSave,
        bagOpen,
        setBagOpen,
        toast,
        freeShippingLeft: Math.max(0, FREE_SHIPPING - (subtotal - discount)),
        freeShippingProgress: Math.min(1, FREE_SHIPPING === 0 ? 1 : (subtotal - discount) / FREE_SHIPPING)
    };

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used inside StoreProvider');
    return context;
}
