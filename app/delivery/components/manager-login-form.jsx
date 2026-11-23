'use client';

import { useActionState } from 'react';
import { managerLoginAction } from '../actions';

export function ManagerLoginForm() {
    const [state, formAction, pending] = useActionState(managerLoginAction, {});

    return (
        <form action={formAction} className="flex flex-col gap-4 max-w-sm mx-auto p-8 border rounded-2xl border-white/15 bg-white/5">
            <h2 className="text-center">👔 כניסת מנהל</h2>
            <label className="flex flex-col gap-1 text-sm">
                סיסמה
                <input
                    type="password"
                    name="password"
                    autoFocus
                    className="px-3 py-2 text-white rounded-lg bg-neutral-900 border border-white/15 focus:outline-none focus:border-primary"
                    placeholder="הזן סיסמה"
                />
            </label>
            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
            <button type="submit" disabled={pending} className="btn btn-lg disabled:opacity-50">
                {pending ? 'מתחבר…' : 'כניסה'}
            </button>
        </form>
    );
}
