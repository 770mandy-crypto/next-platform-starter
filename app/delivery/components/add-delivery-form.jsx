'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addDeliveryAction } from '../actions';

export function AddDeliveryForm() {
    const [state, formAction, pending] = useActionState(addDeliveryAction, {});
    const formRef = useRef(null);

    // איפוס הטופס לאחר הוספה מוצלחת
    useEffect(() => {
        if (state?.success) formRef.current?.reset();
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
                    תשלום לשליח (₪) *
                    <input
                        name="payment"
                        type="number"
                        min="1"
                        step="0.5"
                        required
                        className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                        placeholder="כמה השליח מקבל?"
                    />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    עד מתי אפשר לקחת
                    <input
                        name="deadline"
                        className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                        placeholder="למשל: היום עד 18:00"
                    />
                </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
                הערות (לא חובה)
                <input
                    name="notes"
                    className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                    placeholder="פרטים נוספים, טלפון לקוח וכו׳"
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
