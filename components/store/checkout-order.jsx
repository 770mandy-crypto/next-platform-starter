'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from 'components/store/cart-provider';
import { formatPrice } from 'lib/format';

const FREE_SHIPPING_THRESHOLD = 350;
const SHIPPING_COST = 29;
const WHATSAPP = '972559725632';

const FIELDS = [
    { id: 'name', label: 'שם מלא', type: 'text', autoComplete: 'name' },
    { id: 'phone', label: 'טלפון', type: 'tel', autoComplete: 'tel' },
    { id: 'email', label: 'אימייל', type: 'email', autoComplete: 'email' },
    { id: 'city', label: 'עיר', type: 'text', autoComplete: 'address-level2' },
    { id: 'street', label: 'רחוב ומספר', type: 'text', autoComplete: 'street-address' }
];

function validate(values) {
    const errors = {};
    if (values.name.trim().length < 2) errors.name = 'נא למלא שם מלא';
    if (!/^0\d{1,2}-?\d{7}$/.test(values.phone.replace(/\s/g, ''))) errors.phone = 'מספר טלפון לא תקין';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) errors.email = 'כתובת אימייל לא תקינה';
    if (values.city.trim().length < 2) errors.city = 'נא למלא עיר';
    if (values.street.trim().length < 2) errors.street = 'נא למלא רחוב ומספר';
    return errors;
}

export function CheckoutOrder() {
    const { lines, subtotal, hydrated, clear } = useCart();
    const [values, setValues] = useState({ name: '', phone: '', email: '', city: '', street: '', note: '' });
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);
    const [placed, setPlaced] = useState(null);

    if (!hydrated) return <p className="mt-10 text-muted">טוען…</p>;

    if (!lines.length && !placed) {
        return (
            <div className="mt-10">
                <p className="text-muted">העגלה ריקה, אז אין מה לשלוח.</p>
                <Link href="/shop" className="inline-flex mt-8 btn-gold">
                    לקולקציה
                </Link>
            </div>
        );
    }

    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + shipping;

    /** Everything the shop needs to fulfil the order, in one message. */
    function orderMessage(orderId, snapshot) {
        const items = snapshot.lines
            .map((l) => `• ${l.title}${l.size ? ` · מידה ${l.size}` : ''} × ${l.quantity} — ${formatPrice(l.price * l.quantity)}`)
            .join('\n');
        return [
            `הזמנה חדשה ${orderId}`,
            '',
            items,
            '',
            `משלוח: ${snapshot.shipping ? formatPrice(snapshot.shipping) : 'חינם'}`,
            `סה״כ: ${formatPrice(snapshot.total)}`,
            '',
            `שם: ${values.name}`,
            `טלפון: ${values.phone}`,
            `אימייל: ${values.email}`,
            `כתובת: ${values.street}, ${values.city}`,
            values.note.trim() ? `הערה: ${values.note.trim()}` : null
        ]
            .filter(Boolean)
            .join('\n');
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const found = validate(values);
        setErrors(found);
        if (Object.keys(found).length) return;

        setSending(true);
        const snapshot = { lines, shipping, total };
        const orderId = `AM-${Date.now().toString(36).toUpperCase().slice(-6)}`;

        // Recording the order is best effort: if the database is not wired up yet,
        // the customer still gets their number and the WhatsApp handoff below.
        try {
            await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    customer: values,
                    items: lines.map((l) => ({ slug: l.slug, size: l.size ?? null, quantity: l.quantity }))
                })
            });
        } catch {
            /* handled by the WhatsApp path */
        }

        setPlaced({ orderId, message: orderMessage(orderId, snapshot) });
        clear?.();
        setSending(false);
    }

    if (placed) {
        return (
            <div className="mt-12 text-center">
                <div className="mb-4 text-5xl">✓</div>
                <h2 className="mb-3 text-3xl">ההזמנה נקלטה</h2>
                <p className="mb-2 font-mono text-lg tracking-widest">{placed.orderId}</p>
                <p className="mx-auto mb-8 max-w-md leading-relaxed text-muted">
                    <strong>לא בוצע חיוב.</strong> שלח לנו את פרטי ההזמנה בוואטסאפ ונחזור אליך
                    לתיאום התשלום והמשלוח, בדרך כלל תוך יום עסקים.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                    <a
                        className="btn-gold"
                        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(placed.message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        שליחת ההזמנה בוואטסאפ
                    </a>
                    <Link href="/shop" className="btn-line">
                        חזרה לקולקציה
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-12 mt-10 lg:grid-cols-[1.2fr_.8fr]">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {FIELDS.map((field) => (
                    <label key={field.id} className="flex flex-col gap-2">
                        <span className="text-sm text-muted">{field.label}</span>
                        <input
                            type={field.type}
                            autoComplete={field.autoComplete}
                            value={values[field.id]}
                            onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
                            className="px-4 py-3 border bg-transparent hairline"
                            aria-invalid={Boolean(errors[field.id])}
                        />
                        {errors[field.id] && <span className="text-sm text-red-400">{errors[field.id]}</span>}
                    </label>
                ))}

                <label className="flex flex-col gap-2">
                    <span className="text-sm text-muted">הערה לשליח (לא חובה)</span>
                    <textarea
                        rows={3}
                        value={values.note}
                        onChange={(e) => setValues({ ...values, note: e.target.value })}
                        className="px-4 py-3 border bg-transparent hairline"
                    />
                </label>

                <p className="text-sm leading-relaxed text-muted">
                    לא נגבה תשלום באתר. אחרי השליחה נחזור אליך לתיאום התשלום והמשלוח.
                </p>

                <button type="submit" disabled={sending} className="btn-gold disabled:opacity-50">
                    {sending ? 'שולח…' : `שליחת הזמנה · ${formatPrice(total)}`}
                </button>
            </form>

            <aside className="flex flex-col gap-3 p-6 border h-max hairline">
                <h2 className="text-lg">סיכום הזמנה</h2>
                {lines.map((line) => (
                    <div key={`${line.slug}-${line.size}`} className="flex justify-between gap-4 text-sm">
                        <span className="text-muted">
                            {line.title}
                            {line.size ? ` · ${line.size}` : ''} × {line.quantity}
                        </span>
                        <span>{formatPrice(line.price * line.quantity)}</span>
                    </div>
                ))}
                <div className="flex justify-between pt-3 text-sm border-t hairline">
                    <span className="text-muted">משלוח</span>
                    <span>{shipping ? formatPrice(shipping) : 'חינם'}</span>
                </div>
                <div className="flex justify-between text-lg">
                    <span>סה״כ</span>
                    <strong>{formatPrice(total)}</strong>
                </div>
            </aside>
        </div>
    );
}
