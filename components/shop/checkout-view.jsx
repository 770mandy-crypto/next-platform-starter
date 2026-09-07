'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useShop } from './providers';
import { IconArrow } from './icons';

export function CheckoutView() {
    const { t, lang, price, items, subtotal, discount, shipping, total, promo, clearCart, hydrated } = useShop();
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);
    const [payError, setPayError] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', address: '' });

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setPayError(null);

        try {
            // The server prices the bag from the catalogue; this only says what
            // was chosen.
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lang,
                    promo,
                    items: items.map((line) => ({
                        variantId: line.variantId,
                        lensId: line.lensId,
                        qty: line.qty
                    }))
                })
            });

            if (response.ok) {
                const { url } = await response.json();
                if (url) {
                    window.location.href = url;
                    return;
                }
            }

            const body = await response.json().catch(() => ({}));
            if (response.status === 503 && body.error === 'stripe_not_configured') {
                // No payment provider on this deploy: fall back to the demo
                // confirmation rather than leaving the shopper stuck.
                setDone(true);
                clearCart();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            setPayError(t.checkout.payError);
        } catch {
            setPayError(t.checkout.payError);
        } finally {
            setBusy(false);
        }
    };

    if (done) {
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

    if (hydrated && items.length === 0) {
        return (
            <section className="px-5 py-32 text-center sm:px-10">
                <h1 className="mb-4 text-[clamp(2rem,5vw,3rem)]">{t.cart.empty}</h1>
                <p className="mb-10 text-inksoft">{t.cart.emptyBody}</p>
                <Link href="/collection" className="btn-ayin">
                    <span>{t.cart.emptyCta}</span>
                </Link>
            </section>
        );
    }

    return (
        <section className="px-5 py-16 sm:px-10 sm:py-24">
            <div className="grid gap-12 mx-auto max-w-5xl lg:grid-cols-[1.1fr_1fr] lg:gap-20">
                <div>
                    <h1 className="mb-4 text-[clamp(2rem,5vw,3rem)]">{t.checkout.title}</h1>
                    <p className="mb-10 text-sm text-inksoft">{t.checkout.body}</p>

                    <form onSubmit={submit} className="space-y-5">
                        {[
                            { key: 'name', label: t.checkout.name, type: 'text' },
                            { key: 'email', label: t.checkout.email, type: 'email' },
                            { key: 'address', label: t.checkout.address, type: 'text' }
                        ].map((field) => (
                            <label key={field.key} className="block">
                                <span className="block mb-2 eyebrow">{field.label}</span>
                                <input
                                    required
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                                    className="w-full px-5 py-4 text-sm bg-transparent border rounded-none hairline focus:outline-none focus:border-ink"
                                />
                            </label>
                        ))}
                        <button type="submit" disabled={busy} className="w-full btn-ayin disabled:opacity-60">
                            <span>{busy ? t.checkout.working : t.checkout.place}</span>
                            <IconArrow className="w-4 h-4 rtl:rotate-180" />
                        </button>
                        {payError && (
                            <p role="alert" className="text-sm text-red-700">
                                {payError}
                            </p>
                        )}
                    </form>
                </div>

                <aside className="p-6 rounded-none bg-bone h-fit lg:sticky lg:top-24">
                    <ul className="divide-y hairline">
                        {items.map((line) => (
                            <li key={line.key} className="flex gap-4 py-4">
                                <span className="relative w-16 h-16 overflow-hidden rounded-lg shrink-0 bg-paper">
                                    <Image src={line.variant.image} alt="" fill sizes="64px" className="object-cover" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block display text-base">{line.product.name[lang]}</span>
                                    <span className="block text-xs text-inksoft">
                                        {line.variant.color[lang]} · {t.cart.qty} {line.qty}
                                    </span>
                                </span>
                                <span className="text-sm ticker-digit">{price(line.total)}</span>
                            </li>
                        ))}
                    </ul>

                    <dl className="pt-4 mt-4 space-y-2 text-sm border-t hairline">
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
                </aside>
            </div>
        </section>
    );
}
