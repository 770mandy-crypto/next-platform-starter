'use client';

import { useActionState } from 'react';
import { courierLoginAction } from '../actions';

export function CourierLoginForm() {
    const [state, formAction, pending] = useActionState(courierLoginAction, {});

    return (
        <form action={formAction} className="flex flex-col gap-4 max-w-sm mx-auto p-8 border rounded-2xl border-white/15 bg-white/5">
            <h2 className="text-center">🛵 כניסת שליח</h2>
            <p className="text-sm text-center text-white/70">הזן את שמך כדי להתחיל</p>
            <label className="flex flex-col gap-1 text-sm">
                שם השליח
                <input
                    name="name"
                    autoFocus
                    className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                    placeholder="למשל: יוסי"
                />
            </label>
            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
            <button type="submit" disabled={pending} className="btn btn-lg disabled:opacity-50">
                {pending ? 'נכנס…' : 'כניסה'}
            </button>
        </form>
    );
}
