// The engine that runs a mission: one request from the user to one agent
// (usually the manager), carried out to the end in the background.
//
// An agent runs as a manual tool loop: Claude answers, the tools it calls run
// here, their results go back, and it continues until it is done. The
// manager's `delegate` tool starts a specialist as a nested run of the same
// loop and hands its result back as the tool result; that is how the agents
// talk to each other. The team is one level deep: specialists cannot
// delegate, so a mission cannot fan out without bound.
//
// Progress is written to the mission record as it happens (throttled), and the
// command room polls it, so the user watches each agent work, can close the
// page, and finds the result when they come back, on any device.

import Anthropic from '@anthropic-ai/sdk';
import { consumeAiQuota } from '../pilot/workspace.js';
import { getAgent } from './agents.js';
import { AGENT_EFFORT, systemPrompt } from './prompts.js';
import { runTool, parseToolInput, toolsFor } from './tools.js';
import {
    getMission,
    listMissions,
    logActivity,
    newId,
    releaseMissionLock,
    saveMission
} from './store.js';

const MODEL = () => process.env.MENDI_MODEL || 'claude-opus-5-5';
const MAX_TOKENS = 32_000;
// Tool rounds per agent run. The manager's meeting flow takes about four
// (plan + three delegations + the answer); a specialist rarely needs more than
// a few. pause_turn resumes (long web research) count as rounds too.
export const MAX_ROUNDS = { manager: 10, specialist: 8 };
export const MAX_DELEGATIONS_PER_TURN = 4;
export const MISSION_DEADLINE_MS = 13 * 60_000;
const HISTORY_MISSIONS = 6;
const MAX_RESULT_CHARS = 40_000;
const SAVE_EVERY_MS = 900;

// The blocks of a turn that are sent back with its tool results. If a safety
// fallback happened mid-turn, what the declined model produced before the last
// fallback marker is kept only as text, as the API requires.
export function replayable(content) {
    const boundary = content.findLastIndex((block) => block.type === 'fallback');
    if (boundary < 0) return content;
    return content.filter((block, index) => index > boundary || block.type === 'text');
}

// Earlier answered exchanges in the same room, oldest first, as context. They
// come from the server's own records, not from the browser.
export async function historyFor(userId, mission) {
    const earlier = (await listMissions(userId, 40))
        .filter((item) => item.room === mission.room && item.id < mission.id && item.status === 'done' && item.reply)
        .slice(0, HISTORY_MISSIONS)
        .reverse();
    const messages = [];
    for (const item of earlier) {
        messages.push({ role: 'user', content: item.message }, { role: 'assistant', content: item.reply.slice(-20_000) });
    }
    messages.push({ role: 'user', content: mission.message });
    return messages;
}

// Holds the mission record in memory and writes it back at most every
// SAVE_EVERY_MS, one write at a time, plus once at the end.
function recorder(userId, mission) {
    let timer = null;
    let writing = Promise.resolve();
    const flush = () => {
        clearTimeout(timer);
        timer = null;
        const snapshot = structuredClone(mission);
        writing = writing.then(() => saveMission(userId, snapshot)).catch((error) => console.error('MENDI save failed:', error));
        return writing;
    };
    return {
        mission,
        touch() {
            mission.updatedAt = new Date().toISOString();
            timer ??= setTimeout(flush, SAVE_EVERY_MS);
        },
        flush
    };
}

export async function runAgent({ client, agentId, messages, ctx, depth, onText, signal }) {
    const tools = toolsFor(agentId, { canDelegate: depth === 0 });
    const conversation = [...messages];
    const maxRounds = agentId === 'manager' ? MAX_ROUNDS.manager : MAX_ROUNDS.specialist;
    let text = '';
    let container;

    for (let round = 0; round < maxRounds; round += 1) {
        const stream = client.beta.messages.stream(
            {
                model: MODEL(),
                max_tokens: MAX_TOKENS,
                system: systemPrompt(agentId, { user: ctx.user }),
                thinking: { type: 'adaptive' },
                output_config: { effort: AGENT_EFFORT[agentId] ?? 'low' },
                // If a safety classifier declines, the server retries on its
                // default fallback model within the same stream.
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                ...(tools.length ? { tools } : {}),
                ...(container ? { container } : {}),
                messages: conversation
            },
            { signal }
        );

        for await (const event of stream) {
            if (event.type === 'content_block_start') {
                const block = event.content_block;
                if (block.type === 'server_tool_use') ctx.note(agentId, block.name);
            } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                text += event.delta.text;
                onText(event.delta.text);
            }
        }
        const final = await stream.finalMessage();
        container = final.container?.id ?? container;
        const content = replayable(final.content);

        // A long web research turn can pause; it resumes by sending it back.
        if (final.stop_reason === 'pause_turn') {
            conversation.push({ role: 'assistant', content });
            continue;
        }
        // A refused or cut-off turn never runs its tools: a refusal or the
        // output cap can stop a tool call partway through its input.
        if (final.stop_reason !== 'tool_use') return { text, stop: final.stop_reason };

        const calls = content.filter((block) => block.type === 'tool_use');
        const results = new Array(calls.length);
        const delegations = [];

        for (const [index, call] of calls.entries()) {
            if (call.name === 'delegate' && depth === 0) {
                delegations.push(index);
                continue;
            }
            ctx.note(agentId, call.name);
            const outcome = await runTool(call.name, call.input, { ...ctx.toolContext, agentId });
            ctx.note(agentId, call.name, !outcome.isError);
            results[index] = toolResult(call, outcome.result, outcome.isError);
        }

        // Independent steps the manager hands out in one turn run side by side.
        await Promise.all(
            delegations.map(async (index, order) => {
                const call = calls[index];
                if (order >= MAX_DELEGATIONS_PER_TURN) {
                    results[index] = toolResult(call, { error: `At most ${MAX_DELEGATIONS_PER_TURN} delegations per turn; send the rest after these finish.` }, true);
                    return;
                }
                results[index] = await delegate({ client, call, ctx, signal });
            })
        );

        if (text && !text.endsWith('\n')) {
            text += '\n\n';
            onText('\n\n');
        }
        conversation.push({ role: 'assistant', content }, { role: 'user', content: results });
    }
    return { text, stop: 'max_rounds' };
}

function toolResult(call, result, isError) {
    return {
        type: 'tool_result',
        tool_use_id: call.id,
        content: JSON.stringify(result),
        ...(isError ? { is_error: true } : {})
    };
}

async function delegate({ client, call, ctx, signal }) {
    const parsed = parseToolInput('delegate', call.input);
    if (!parsed.ok) return toolResult(call, parsed.error, true);
    const { agent: agentId, task, context } = parsed.data;

    try {
        await consumeAiQuota(ctx.userId);
    } catch (error) {
        return toolResult(call, { error: error.message }, true);
    }

    const step = ctx.startStep(agentId, task);
    const content = context ? `${task}\n\n---\nMaterial from the manager:\n${context}` : task;
    try {
        const outcome = await runAgent({
            client,
            agentId,
            messages: [{ role: 'user', content }],
            ctx: ctx.forStep(step),
            depth: 1,
            signal,
            onText: (piece) => ctx.stepText(step, piece)
        });
        const ok = outcome.stop === 'end_turn' || outcome.stop === 'stop_sequence';
        ctx.endStep(step, ok ? 'done' : 'failed', outcome.stop);
        return toolResult(
            call,
            {
                agent: agentId,
                status: ok ? 'done' : outcome.stop === 'refusal' ? 'declined' : 'incomplete',
                result: outcome.text.slice(-MAX_RESULT_CHARS),
                files: step.files.map(({ id, name }) => ({ file_id: id, name })),
                actions: step.actions.map(({ id, kind, status, to }) => ({
                    action_id: id,
                    kind,
                    status: status === 'pending' ? 'waiting_for_approval' : status,
                    to
                }))
            },
            !ok
        );
    } catch (error) {
        if (signal.aborted) throw error;
        console.error(`MENDI agent ${agentId} failed:`, error);
        ctx.endStep(step, 'failed', 'error');
        return toolResult(call, { agent: agentId, status: 'failed', error: 'The agent hit an internal error.' }, true);
    }
}

// Runs a queued mission to the end. Safe to call more than once: only the
// first call that finds it queued runs it.
export async function runMission({ userId, missionId, user, origin, client = new Anthropic() }) {
    const stored = await getMission(userId, missionId);
    if (!stored || stored.status !== 'queued') return stored;

    const record = recorder(userId, { ...stored, status: 'running', startedAt: new Date().toISOString() });
    const { mission } = record;
    await record.flush();

    const upstream = new AbortController();
    const deadline = setTimeout(() => upstream.abort(), MISSION_DEADLINE_MS);

    const addUnique = (list, item) => {
        const at = list.findIndex((existing) => existing.id === item.id);
        if (at >= 0) list[at] = item;
        else list.push(item);
    };

    const baseCtx = {
        userId,
        user,
        note(agent, tool, ok) {
            mission.activity = [...(mission.activity ?? []), { agent, tool, ...(ok === undefined ? {} : { ok }), at: Date.now() }].slice(-80);
            record.touch();
        },
        startStep(agent, task) {
            const step = { id: newId(), agent, task: task.slice(0, 600), status: 'running', output: '', files: [], actions: [], startedAt: new Date().toISOString() };
            mission.steps.push(step);
            record.touch();
            logActivity(userId, { agent, kind: 'step', summary: task.slice(0, 160), missionId }).catch(() => {});
            return step;
        },
        stepText(step, piece) {
            step.output += piece;
            record.touch();
        },
        endStep(step, status, reason) {
            step.status = status;
            step.reason = reason;
            step.endedAt = new Date().toISOString();
            record.touch();
        }
    };

    const contextFor = (step) => ({
        ...baseCtx,
        toolContext: {
            userId,
            origin,
            missionId,
            emit(event) {
                if (event.type === 'file') {
                    addUnique(mission.files, event.file);
                    if (step) addUnique(step.files, event.file);
                } else if (event.type === 'action') {
                    addUnique(mission.actions, event.action);
                    if (step) addUnique(step.actions, event.action);
                } else if (event.type === 'task') {
                    addUnique(mission.tasks, event.task);
                }
                record.touch();
            }
        },
        forStep: (next) => contextFor(next)
    });

    mission.files ??= [];
    mission.actions ??= [];
    mission.tasks ??= [];

    try {
        const messages = await historyFor(userId, mission);
        const outcome = await runAgent({
            client,
            agentId: mission.agentId,
            messages,
            ctx: contextFor(null),
            depth: 0,
            signal: upstream.signal,
            onText: (piece) => {
                mission.reply += piece;
                record.touch();
            }
        });
        mission.status = outcome.stop === 'refusal' ? 'refused' : 'done';
        mission.stop = outcome.stop;
        if (outcome.stop === 'max_tokens' || outcome.stop === 'max_rounds') mission.truncated = true;
        if (outcome.stop === 'refusal') mission.reply = '';
    } catch (error) {
        mission.status = 'failed';
        mission.error = upstream.signal.aborted
            ? 'המשימה ארכה יותר מדי זמן ונעצרה. אפשר לבקש מהמנהל להמשיך מאיפה שעצר.'
            : 'משהו השתבש בזמן העבודה. נסו שוב.';
        if (!upstream.signal.aborted) console.error('MENDI mission failed:', error);
        for (const step of mission.steps) if (step.status === 'running') step.status = 'failed';
    } finally {
        clearTimeout(deadline);
        mission.endedAt = new Date().toISOString();
        await record.flush();
        await releaseMissionLock(userId, missionId).catch((error) => console.error('MENDI lock release failed:', error));
    }

    await logActivity(userId, {
        agent: mission.agentId,
        kind: mission.status === 'done' ? 'mission' : 'failed',
        summary: `${getAgent(mission.agentId)?.label ?? mission.agentId}: ${mission.message.slice(0, 120)}`,
        missionId
    }).catch(() => {});
    return mission;
}
