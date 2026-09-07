'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useShop } from './providers';
import { useDialog } from '../../lib/shop/use-dialog';
import { IconClose } from './icons';

function QtyStepper({ value, onChange }) {
    return (
        <div className="inline-flex items-center border hairline rounded-none">
            <button
                type="button"
                onClick={() => onChange(value - 1)}
                className="w-8 h-8 leading-none text-lg transition-colors hover:text-brass"
                aria-label="-"
            >
                −
            </button>
            <span className="w-6 text-sm text-center ticker-digit">{value}</span>
            <button
                type="button"
                onClick={() => onChange(value + 1)}
                className="w-8 h-8 leading-none text-lg transition-colors hover:text-brass"
                aria-label="+"
            >
                +
            </button>
        </div>
    );
}

export function CartDrawer() {
    const {
        t,
        lang,
        price,
        items,
        subtotal,
        discount,
        shipping,
        total,
        setQty,
        removeItem,
        cartOpen,
        setCartOpen,
        promo,
        applyPromo,
        clearPromo,
        freeShippingRemaining,
        freeShippingProgress
    } = useShop();
    const [code, setCode] = useState('');
    const [codeState, setCodeState] = useState(null);
    const close = useCallback(() => setCartOpen(false), [setCartOpen]);
    const panelRef = useDialog(cartOpen, close);

    const submitCode = (event) => {
        event.preventDefault();
        if (promo) {
            clearPromo();
            setCode('');
            setCodeState(null);
            return;
        }
        setCodeState(applyPromo(code) ? 'ok' : 'bad');
    };

    return (
        <div
            className={`fixed inset-0 z-[60] transition-opacity duration-400 ${
                cartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            // inert keeps the closed drawer out of the tab order and away from
            // screen readers; opacity alone would leave it reachable.
            inert={!cartOpen}
        >
            <button
                type="button"
                aria-label="Close bag"
                onClick={() => setCartOpen(false)}
                className="absolute inset-0 w-full h-full bg-black/55 backdrop-blur-[3px]"
            />

            <aside
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={t.cart.title}
                tabIndex={-1}
                className={`absolute inset-y-0 end-0 flex flex-col w-full max-w-[27rem] bg-paper shadow-2xl outline-none transition-transform duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    cartOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b hairline">
                    <h3 className="display text-xl">
                        {t.cart.title}
                        {items.length > 0 && <span className="ms-2 text-inksoft text-base">({items.length})</span>}
                    </h3>
                    <button type="button" onClick={() => setCartOpen(false)} aria-label="Close">
                        <IconClose className="w-6 h-6 transition-transform hover:rotate-90 duration-300" />
                    </button>
                </div>

                {items.length > 0 && (
                    <div className="px-6 py-4 border-b hairline bg-bone/60">
                        <p className="mb-2 text-xs tracking-wide text-inksoft">
                            {freeShippingRemaining > 0
                                ? t.cart.freeShipIn(price(freeShippingRemaining))
                                : `✓ ${t.cart.freeShipDone}`}
                        </p>
                        <div className="h-[3px] overflow-hidden rounded-full bg-line">
                            <div
                                className="h-full transition-all duration-700 ease-out rounded-full bg-brass"
                                style={{ width: `${Math.round(freeShippingProgress * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex-1 px-6 overflow-y-auto scrollbar-hidden">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <p className="display text-2xl mb-3">{t.cart.empty}</p>
                            <p className="max-w-[16rem] mb-8 text-sm text-inksoft">{t.cart.emptyBody}</p>
                            <Link href="/collection" onClick={() => setCartOpen(false)} className="btn-ayin btn-sm">
                                <span>{t.cart.emptyCta}</span>
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y hairline">
                            {items.map((line) => (
                                <li key={line.key} className="flex gap-4 py-5 animate-in-up">
                                    <Link
                                        href={`/product/${line.product.slug}`}
                                        onClick={() => setCartOpen(false)}
                                        className="relative w-24 h-24 overflow-hidden rounded-lg shrink-0 bg-plate"
                                    >
                                        <Image
                                            src={line.variant.image}
                                            alt={line.product.name[lang]}
                                            fill
                                            sizes="96px"
                                            className="object-cover"
                                        />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between gap-2">
                                            <Link
                                                href={`/product/${line.product.slug}`}
                                                onClick={() => setCartOpen(false)}
                                                className="display text-lg leading-tight hover:text-brass"
                                            >
                                                {line.product.name[lang]}
                                            </Link>
                                            <span className="text-sm ticker-digit">{price(line.total)}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-inksoft">
                                            {line.variant.color[lang]} · {line.variant.accent[lang]}
                                        </p>
                                        {line.lens.price > 0 && (
                                            <p className="mt-0.5 text-xs text-brass">{line.lens.label[lang]}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-3">
                                            <QtyStepper value={line.qty} onChange={(next) => setQty(line.key, next)} />
                                            <button
                                                type="button"
                                                onClick={() => removeItem(line.key)}
                                                className="text-xs underline text-inksoft hover:text-ink underline-offset-4"
                                            >
                                                {t.cart.remove}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="px-6 py-5 border-t hairline bg-bone/40">
                        <form onSubmit={submitCode} className="flex gap-2 mb-4">
                            <input
                                value={promo ?? code}
                                onChange={(event) => {
                                    setCode(event.target.value);
                                    setCodeState(null);
                                }}
                                readOnly={Boolean(promo)}
                                placeholder={t.cart.promo}
                                className="flex-1 px-4 py-2.5 text-sm bg-transparent border rounded-none hairline focus:outline-none focus:border-ink placeholder:text-inksoft/70"
                            />
                            <button type="submit" className="btn-ayin btn-sm">
                                <span>{promo ? t.cart.remove : t.cart.apply}</span>
                            </button>
                        </form>
                        {codeState === 'bad' && <p className="mb-3 -mt-2 text-xs text-red-700">{t.cart.promoBad}</p>}

                        <dl className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-inksoft">{t.cart.subtotal}</dt>
                                <dd className="ticker-digit">{price(subtotal)}</dd>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-brass">
                                    <dt>
                                        {t.cart.discount} · {promo}
                                    </dt>
                                    <dd className="ticker-digit">−{price(discount)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <dt className="text-inksoft">{t.cart.shipping}</dt>
                                <dd className="ticker-digit">{shipping === 0 ? t.cart.free : price(shipping)}</dd>
                            </div>
                            <div className="flex justify-between pt-3 mt-3 border-t hairline">
                                <dt className="display text-lg">{t.cart.total}</dt>
                                <dd className="display text-lg ticker-digit">{price(total)}</dd>
                            </div>
                        </dl>

                        <Link
                            href="/checkout"
                            onClick={() => setCartOpen(false)}
                            className="w-full mt-5 btn-ayin"
                        >
                            <span>{t.cart.checkout}</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setCartOpen(false)}
                            className="w-full mt-3 text-xs tracking-wide underline text-inksoft underline-offset-4"
                        >
                            {t.cart.continue}
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
}
