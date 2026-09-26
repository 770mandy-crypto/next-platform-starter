import { NextResponse } from 'next/server';

// Every Maslul endpoint takes JSON from the browser. Cap its size so a runaway
// client (or a pasted novel) cannot turn into an unbounded paid request.
const MAX_BODY_BYTES = 200_000;

export async function readJson(request) {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
        return { error: NextResponse.json({ error: 'הבקשה גדולה מדי.' }, { status: 413 }) };
    }
    try {
        return { body: JSON.parse(raw || '{}') };
    } catch {
        return { error: NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין.' }, { status: 400 }) };
    }
}

export function clip(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
