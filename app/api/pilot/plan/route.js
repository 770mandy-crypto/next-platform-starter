import { NextResponse } from 'next/server';
import { generatePlan } from 'lib/pilot/ai';
import { clip, HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);

    const goal = clip(body.goal, 500);
    if (!goal) throw new HttpError('חסרה מטרה.', 400);

    await consumeAiQuota(user.id);
    const weeks = Math.min(52, Math.max(1, Math.round(Number(body.weeks) || 6)));
    const plan = await generatePlan({ goal, context: clip(body.context, 2000), weeks });
    return NextResponse.json(plan);
});
