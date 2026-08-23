'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from 'components/store/cart-provider';

/*
Quick add lives on the catalog card: pick a size and a quantity and the line
lands in the cart without leaving the grid. The full product page still owns
colour selection and the long copy.
*/
export function QuickAdd({ product }) {
    const { addLine } = useCart();
    const [open, setOpen] = useState(false);
    const [size, setSize] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);
    const panelRef = useRef(null);
    const resetTimer = useRef(null);

    useEffect(() => () => window.clearTimeout(resetTimer.current), []);

    // Clicking anywhere else closes the panel, so open cards never stack up.
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (!panelRef.current?.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    function handleAdd() {
        if (!size) return;
        addLine({
            slug: product.slug,
            title: product.title,
            price: product.price,
            cut: product.cut,
            tone: product.tone,
            photo: product.photo ?? null,
            size,
            color: product.colors[0]?.name ?? '',
            quantity,
            variantId: product.variants?.[0]?.id ?? null
        });
        setAdded(true);
        window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => {
            setAdded(false);
            setOpen(false);
            setQuantity(1);
            setSize(null);
        }, 2200);
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full py-3 mt-4 text-[0.62rem] font-semibold tracking-[0.26em] uppercase transition-all duration-300 border cursor-pointer hover:text-ink"
                style={{ borderColor: 'var(--color-hairline)', color: 'var(--color-gold)' }}
                onMouseEnter={(event) => {
                    event.currentTarget.style.background = 'var(--color-gold)';
                    event.currentTarget.style.borderColor = 'var(--color-gold)';
                }}
                onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'transparent';
                    event.currentTarget.style.borderColor = 'var(--color-hairline)';
                }}
            >
                הוספה מהירה
            </button>
        );
    }

    return (
        <div
            ref={panelRef}
            className="p-4 mt-4 border quick-add-panel"
            style={{ borderColor: 'var(--color-gold)', background: 'var(--color-ink-2)' }}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-[0.58rem] font-semibold tracking-[0.26em] uppercase text-gold">מידה</span>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="סגירה"
                    className="text-sm leading-none cursor-pointer text-muted hover:text-bone"
                >
                    ✕
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {product.sizes.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setSize(option)}
                        aria-pressed={size === option}
                        className="min-w-11 px-3 py-2 text-[0.7rem] tracking-[0.12em] uppercase transition-all duration-200 border cursor-pointer"
                        style={
                            size === option
                                ? {
                                      borderColor: 'var(--color-gold)',
                                      background: 'var(--color-gold)',
                                      color: 'var(--color-ink)'
                                  }
                                : { borderColor: 'var(--color-hairline)', color: 'var(--color-bone)' }
                        }
                    >
                        {option}
                    </button>
                ))}
            </div>

            <div className="flex items-stretch gap-3 mt-4">
                <div className="flex items-center border hairline shrink-0">
                    <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        aria-label="הפחת כמות"
                        className="px-3 py-2 text-base leading-none transition-colors cursor-pointer hover:text-gold"
                    >
                        −
                    </button>
                    <span className="w-7 text-xs text-center tabular-nums" aria-live="polite">
                        {quantity}
                    </span>
                    <button
                        type="button"
                        onClick={() => setQuantity((current) => Math.min(10, current + 1))}
                        aria-label="הוסף כמות"
                        className="px-3 py-2 text-base leading-none transition-colors cursor-pointer hover:text-gold"
                    >
                        +
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!size}
                    className="grow py-2 text-[0.62rem] font-semibold tracking-[0.2em] uppercase transition-all duration-300 border"
                    style={
                        size
                            ? {
                                  borderColor: 'var(--color-gold)',
                                  background: 'var(--color-gold)',
                                  color: 'var(--color-ink)',
                                  cursor: 'pointer'
                              }
                            : {
                                  borderColor: 'var(--color-hairline)',
                                  color: 'var(--color-muted)',
                                  cursor: 'not-allowed'
                              }
                    }
                >
                    {added ? '✓ נוסף לעגלה' : size ? 'הוספה לעגלה' : 'בחר מידה'}
                </button>
            </div>
        </div>
    );
}
