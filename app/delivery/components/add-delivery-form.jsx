'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { addDeliveryAction } from '../actions';

export function AddDeliveryForm() {
    const [state, formAction, pending] = useActionState(addDeliveryAction, {});
    const formRef = useRef(null);

    // מעקב חי אחרי הרווח: מחיר ללקוח פחות תשלום לשליח
    const [customerPrice, setCustomerPrice] = useState('');
    const [payment, setPayment] = useState('');
    const profit = Number(customerPrice || 0) - Number(payment || 0);
    const hasNumbers = customerPrice !== '' && payment !== '';

    // איפוס הטופס לאחר הוספה מוצלחת
    useEffect(() => {
        if (state?.success) {
            formRef.current?.reset();
            setCustomerPrice('');
            setPayment('');
        }
    }, [state]);

    return (
        <form
            ref={formRef}
            action={formAction}
            className="flex flex-col gap-4 p-6 border rounded-2xl border-white/15 bg-white/5"
        >
            <h2>➕ הוספת משלוח חדש</h2>

            <label className="flex flex-col gap-1 text-sm">
                כתובת המשלוח *
                <input
                    name="address"
                    required
                    className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                    placeholder="לאן צריך להביא את המשלוח?"
                />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                    💵 מחיר ללקוח (₪) *
                    <input
                        name="customerPrice"
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={customerPrice}
                        onChange={(e) => setCustomerPrice(e.target.value)}
                        className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                        placeholder="כמה הלקוח משלם?"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    🛵 תשלום לשליח (₪) *
                    <input
                        name="payment"
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                        className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                        placeholder="כמה השליח מקבל?"
                    />
                </label>
            </div>

            {/* מחוון רווח חי */}
            {hasNumbers && (
                <div
                    className={`px-4 py-2 text-sm rounded-lg border ${
                        profit >= 0
                            ? 'border-green-500/40 bg-green-500/10 text-green-300'
                            : 'border-red-500/40 bg-red-500/10 text-red-300'
                    }`}
                >
                    {profit >= 0 ? '📈 הרווח שלך על המשלוח:' : '⚠️ הפסד על המשלוח:'}{' '}
                    <b>{profit} ₪</b>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                    עד מתי אפשר לקחת
                    <input
                        name="deadline"
                        className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                        placeholder="למשל: היום עד 18:00"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    טלפון הלקוח (לא חובה)
                    <input
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                        placeholder="למשל: 050-1234567"
                    />
                </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
                הערות (לא חובה)
                <input
                    name="notes"
                    className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                    placeholder="פרטים נוספים על המשלוח"
                />
            </label>

            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
            {state?.success && <p className="text-sm text-primary">{state.success}</p>}

            <button type="submit" disabled={pending} className="btn disabled:opacity-50 sm:self-start sm:min-w-48">
                {pending ? 'מוסיף…' : 'הוסף משלוח'}
            </button>
        </form>
    );
}
