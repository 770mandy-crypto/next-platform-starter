// Shared plumbing for the GiveBack route handlers: one place that turns
// validation and permission errors into Hebrew JSON responses.

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { currentUser } from './auth.js';
import { InputError } from './items.js';

export function json(body, status = 200) {
    return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function route(handler, { auth = false } = {}) {
    return async (request, context) => {
        try {
            const user = await currentUser();
            if (auth && !user) return json({ error: 'צריך להירשם עם שם כדי להמשיך', code: 'no-user' }, 401);
            const params = context?.params ? await context.params : {};
            return await handler({ request, params, user });
        } catch (error) {
            if (error instanceof InputError) return json({ error: error.message }, error.status);
            if (error instanceof ZodError) return json({ error: error.issues[0]?.message ?? 'קלט לא תקין' }, 400);
            if (error instanceof SyntaxError) return json({ error: 'בקשה לא תקינה' }, 400);
            console.error('[giveback]', error);
            return json({ error: 'משהו השתבש, נסו שוב' }, 500);
        }
    };
}
