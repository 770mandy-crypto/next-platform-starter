import { NextResponse } from 'next/server';
import { generatePlan } from 'lib/pilot/ai';
import { clip, readJson } from '../_input';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { body, error } = await readJson(request);
    if (error) return error;

    const goal = clip(body.goal, 500);
    if (!goal) return NextResponse.json({ error: 'חסרה מטרה.' }, { status: 400 });

    const weeks = Math.min(52, Math.max(1, Math.round(Number(body.weeks) || 6)));
    const plan = await generatePlan({ goal, context: clip(body.context, 2000), weeks });
    return NextResponse.json(plan);
}
