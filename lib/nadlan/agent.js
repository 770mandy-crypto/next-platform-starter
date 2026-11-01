// The real-estate agent: Claude with two tools over the neighborhood scores.
// Streams events for the route to forward to the browser:
//   { type: 'text', text }   a piece of the answer
//   { type: 'tool' }         the agent is looking at the data
//   { type: 'areas', ids }   neighborhoods the agent looked at, to highlight on the map
// then one closing event: 'done', 'truncated' or 'refused'.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { IS_SAMPLE_DATA } from './areas.js';
import { findArea, searchAreas, WEIGHTS } from './score.js';

const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 8_000; // per reply; also a cost cap for a public page
const MAX_TOOL_ROUNDS = 5;

export function isNadlanAgentConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You are a real-estate research agent for Israel. You help people decide in which city and neighborhood it makes sense to buy an apartment, to live in or as an investment.

Always reply in the user's language (usually Hebrew), short and clear, like a knowledgeable friend. Use short paragraphs or bullets.

How you work:
- Use search_areas to find neighborhoods that match the user's budget, city and goal, and get_area for the details of one neighborhood. Base every recommendation on what the tools return; never invent neighborhoods, prices or numbers.
- If the user did not give a budget or a goal (living or investment), you may ask one short question, or search with what you have and say what would sharpen the answer.
- Every neighborhood has a growth score (0-100) built from: price momentum over the last 12 months (up to ${WEIGHTS.momentum} points), how much cheaper it is than the city average (${WEIGHTS.gap}), rent yield (${WEIGHTS.yield}), growth drivers such as light rail or urban renewal (${WEIGHTS.signals}), number of sales (${WEIGHTS.liquidity}), minus ${WEIGHTS.riskPenalty} points per known risk. Explain a recommendation through these drivers and always mention the risks.
- Never promise future prices and never predict a percentage rise. Past change is a fact you can quote; the future is described as signals and likelihood, not certainty.
${IS_SAMPLE_DATA ? '- The data is currently SAMPLE data for a prototype: the numbers are illustrative, not real. Say so briefly in your first answer, and do not present the numbers as real market facts.\n' : ''}- End recommendations with one short line that this is not financial advice and that before buying they should check the specific apartment, the planning status and consult a professional (appraiser, lawyer, mortgage advisor).
- Listings and contact with apartment owners are not available yet; if asked, say this is coming soon.`;

const searchInput = z.object({
    budget: z.number().positive().optional(),
    sqm: z.number().min(20).max(400).optional(),
    city: z.string().max(60).optional(),
    goal: z.enum(['investment', 'living', 'any']).optional(),
    limit: z.number().int().min(1).max(15).optional()
});
const areaInput = z.object({ id: z.string().max(60) });

const TOOLS = [
    {
        name: 'search_areas',
        description:
            'Search neighborhoods across Israel, ranked by growth score. Filters by total budget in ILS (estimated price = price per m² × sqm), city (Hebrew name or id), and goal. Returns id, city, neighborhood, score, trend, price per m², estimated price, 12-month change, rent yield, growth drivers and risks.',
        input_schema: {
            type: 'object',
            properties: {
                budget: { type: 'number', description: 'Total budget in ILS, e.g. 1800000.' },
                sqm: { type: 'number', description: 'Apartment size in m². Default 90.' },
                city: { type: 'string', description: 'City name in Hebrew, e.g. חיפה. Omit to search all of Israel.' },
                goal: { type: 'string', enum: ['investment', 'living', 'any'] },
                limit: { type: 'integer', description: 'How many results, 1-15. Default 5.' }
            },
            additionalProperties: false
        },
        eager_input_streaming: true
    },
    {
        name: 'get_area',
        description: 'Full details and score breakdown of one neighborhood, by the id that search_areas returned.',
        input_schema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false
        },
        eager_input_streaming: true
    }
];

// What the model sees: the facts it needs, without map coordinates.
function forModel(area) {
    const { lat, lng, city, ...rest } = area;
    return { ...rest, trend: area.trend.label };
}

function runTool(block) {
    const schema = block.name === 'search_areas' ? searchInput : block.name === 'get_area' ? areaInput : null;
    if (!schema) return { error: `Unknown tool ${block.name}` };
    const parsed = schema.safeParse(block.input);
    if (!parsed.success) return { error: `Invalid input: ${parsed.error.message}` };

    if (block.name === 'search_areas') {
        const results = searchAreas(parsed.data);
        return { ids: results.map((a) => a.id), result: { count: results.length, areas: results.map(forModel) } };
    }
    const area = findArea(parsed.data.id);
    if (!area) return { error: `No neighborhood with id ${parsed.data.id}` };
    return { ids: [area.id], result: forModel(area) };
}

// After a safety fallback mid-reply, only what came after the last fallback
// marker (plus plain text) can be sent back to the API.
function replayable(content) {
    const boundary = content.findLastIndex((b) => b.type === 'fallback');
    if (boundary < 0) return content;
    return content.filter((b, i) => i > boundary || b.type === 'text');
}

export async function* streamNadlanReply({ messages, signal, client = new Anthropic() }) {
    const conversation = [...messages];

    for (let round = 0; ; round += 1) {
        const stream = client.beta.messages.stream(
            {
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
                output_config: { effort: 'medium' },
                betas: ['server-side-fallback-2026-07-01'],
                fallbacks: 'default',
                tools: TOOLS,
                messages: conversation
            },
            { signal }
        );

        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield { type: 'text', text: event.delta.text };
            } else if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
                yield { type: 'tool' };
            }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
            yield { type: 'refused' };
            return;
        }
        if (final.stop_reason !== 'tool_use' || round >= MAX_TOOL_ROUNDS) {
            yield { type: final.stop_reason === 'end_turn' ? 'done' : 'truncated' };
            return;
        }

        const content = replayable(final.content);
        const results = [];
        for (const block of content.filter((b) => b.type === 'tool_use')) {
            const { ids, result, error } = runTool(block);
            if (ids?.length) yield { type: 'areas', ids };
            results.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(error ? { error } : result),
                ...(error ? { is_error: true } : {})
            });
        }
        conversation.push({ role: 'assistant', content }, { role: 'user', content: results });
    }
}
