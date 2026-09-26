import { NextResponse } from 'next/server';
import { chat } from 'lib/pilot/ai';
import { requiresApproval, validateParams } from 'lib/pilot/policy';
import { clip, readJson } from '../_input';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { body, error } = await readJson(request);
    if (error) return error;

    const message = clip(body.message, 4000);
    if (!message) return NextResponse.json({ error: 'ההודעה ריקה.' }, { status: 400 });

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
}
