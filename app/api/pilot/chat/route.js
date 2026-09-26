import { NextResponse } from 'next/server';
import { chat } from 'lib/pilot/ai';
import { requiresApproval, validateParams } from 'lib/pilot/policy';
import { clip, HttpError, readJson, requireUser, route } from 'lib/pilot/http';
import { consumeAiQuota } from 'lib/pilot/workspace';

export const dynamic = 'force-dynamic';

export const POST = route(async (request) => {
    const user = await requireUser(request);
    const body = await readJson(request);

    const message = clip(body.message, 4000);
    if (!message) throw new HttpError('ההודעה ריקה.', 400);

    await consumeAiQuota(user.id);
    const result = await chat({
        message,
        history: Array.isArray(body.history) ? body.history : [],
        project: body.project ?? null,
        memory: Array.isArray(body.memory) ? body.memory : [],
        tasks: Array.isArray(body.tasks) ? body.tasks : []
    });

    // The approval requirement is stamped here, on the server, from the policy
    // table — never taken from the model's output or the client.
    const actions = (result.actions ?? []).map((action) => ({
        ...action,
        requiresApproval: requiresApproval(action.type),
        problems: validateParams(action.type, action.params ?? {})
    }));

    return NextResponse.json({ ...result, actions });
});
