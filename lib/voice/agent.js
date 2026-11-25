// The voice agent: one Claude conversation that may call the tools in tools.js.
// Its answers are read aloud, so it is asked for short plain Hebrew.

import Anthropic from '@anthropic-ai/sdk';
import { TOOL_EXECUTORS, VOICE_TOOLS } from './tools.js';

export const VOICE_MODEL = process.env.VOICE_AGENT_MODEL || 'claude-sonnet-5-5';

// A cap on tool rounds per reply, so a confused model cannot loop forever.
export const MAX_TOOL_ROUNDS = 5;
const MAX_TOKENS = 1024;

export const VOICE_SYSTEM_PROMPT = [
    'אתה עוזר קולי בעברית. התשובות שלך יוקראו בקול בזמן שהמשתמש מקשיב.',
    'לכן ענה קצר וברור, במשפטים שלמים, בלי כותרות, בלי טבלאות, בלי רשימות ממוספרות ובלי סימני markdown.',
    'לכל חישוב מספרי השתמש בכלי calculate, ולשאלה על השעה או התאריך השתמש בכלי current_time.',
    'אם אינך בטוח במשהו, אמור את זה במפורש במקום לנחש.'
].join('\n');

export function isVoiceAgentConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Resolves to { text, toolCalls } where toolCalls lists the tools that ran, so
// tests and logs can see what the agent actually did.
export async function runVoiceAgent({
    messages,
    client = new Anthropic(),
    model = VOICE_MODEL,
    tools = VOICE_TOOLS,
    executors = TOOL_EXECUTORS
}) {
    const conversation = [...messages];
    const toolCalls = [];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
        const response = await client.messages.create({
            model,
            max_tokens: MAX_TOKENS,
            system: VOICE_SYSTEM_PROMPT,
            tools,
            messages: conversation
        });

        if (response.stop_reason !== 'tool_use') {
            return { text: textOf(response.content), toolCalls };
        }

        conversation.push({ role: 'assistant', content: response.content });
        const uses = response.content.filter((block) => block.type === 'tool_use');
        // Calls the model asked for in one turn are independent, so they run
        // at the same time rather than one after another.
        const results = await Promise.all(uses.map((use) => runTool(use, executors, toolCalls)));
        conversation.push({ role: 'user', content: results });
    }

    throw new Error('הסוכן ביצע יותר מדי קריאות לכלים.');
}

export async function runTool(use, executors, log) {
    log.push({ name: use.name, input: use.input });
    const execute = Object.hasOwn(executors, use.name) ? executors[use.name] : null;
    if (!execute) {
        return { type: 'tool_result', tool_use_id: use.id, is_error: true, content: `כלי לא מוכר: ${use.name}` };
    }
    try {
        const output = await execute(use.input ?? {});
        return { type: 'tool_result', tool_use_id: use.id, content: JSON.stringify(output) };
    } catch (error) {
        return { type: 'tool_result', tool_use_id: use.id, is_error: true, content: error.message };
    }
}

function textOf(content) {
    return content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
}
