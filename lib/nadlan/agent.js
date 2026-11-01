// The real-estate agent: Claude with tools over the neighborhood scores, the
// owners' listings, and a short web search for current planning and transport
// news. Streams events for the route to forward to the browser:
//   { type: 'text', text }   a piece of the answer
//   { type: 'tool', name }   the agent is looking something up
//   { type: 'areas', ids }   neighborhoods the agent looked at (highlighted on the map)
//   { type: 'listings', ids } listings the agent found
// then one closing event: 'done', 'truncated' or 'refused'.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getDb } from '../pilot/db.js';
import { loadDataset } from './dataset.js';
import { searchListings } from './listings.js';
import { searchAreas, WEIGHTS } from './score.js';

const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 8_000; // per reply; also a cost cap for a public page
const MAX_ROUNDS = 6;

export function isNadlanAgentConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Stable instructions, cached. What changes (data date, sample or real) goes
// in a second block after the cache breakpoint.
const SYSTEM = `You are Matzpen ("מצפן נדל״ן"), a real-estate research agent for Israel. You help people decide in which city and neighborhood it makes sense to buy an apartment, to live in or as an investment, and you show them apartments for sale there.

Always reply in the user's language (usually Hebrew), short and clear, like a knowledgeable friend. Use short paragraphs or bullets.

How you work:
- Use search_areas to find neighborhoods by budget, rooms, city and goal, and get_area for one neighborhood's details and price history. Base every number on what the tools return; never invent neighborhoods, prices or figures.
- Prices are medians of real sales from the Israel Tax Authority, published on nadlan.gov.il, for a whole apartment (not per m²). "asOf" is the month of the latest data.
- If the user did not give a budget, rooms or a goal (living or investment), you may ask one short question, or search with what you have and say what would sharpen the answer.
- Each neighborhood has a growth score (0-100): price momentum over 12 months (up to ${WEIGHTS.momentum} points) and 3 years (${WEIGHTS.longTerm}), how much cheaper it is than the city median (${WEIGHTS.gap}), rent yield (${WEIGHTS.yield}), and curated growth drivers such as light rail or approved urban renewal (${WEIGHTS.signals}), minus ${WEIGHTS.riskPenalty} per risk. Parts without data are left out and the score is normalized; "coverage" says how much of the model was used. Explain recommendations through these parts and always mention the risks.
- When growth drivers matter to the answer and the data has none for a neighborhood, you may use web_search to look for current, concrete facts (light rail and train lines, approved urban renewal, large planned projects). Cite what you found and say when you could not confirm something.
- Use search_listings to show apartments for sale that owners published in a neighborhood or city. Mention the price per m² compared with the neighborhood median when it helps. To contact an owner, the user presses "דברו עם בעל הדירה" on the listing; you never have owners' phone numbers.
- Never promise future prices and never predict a percentage rise. Past change is a fact you can quote; the future is described as signals and likelihood.
- End recommendations with one short line that this is not financial advice and that before buying they should check the specific apartment, its legal and planning status, and consult professionals (appraiser, lawyer, mortgage advisor).`;

function dataNote(data) {
    if (data.isSample) {
        return 'DATA STATUS: the real-data import has not run yet, so the tools return SAMPLE data: names are real but the numbers are illustrative. Say so briefly in your first answer and do not present the numbers as market facts.';
    }
    const date = data.updatedAt ? new Date(data.updatedAt).toISOString().slice(0, 10) : 'unknown';
    const national = data.national?.change12m != null ? ` The CBS dwellings price index changed ${data.national.change12m}% over the 12 months to ${data.national.month}.` : '';
    return `DATA STATUS: real data, last refreshed ${date}, covering ${data.cities.length} cities and ${data.areas.length} neighborhoods.${national}`;
}

const searchInput = z.object({
    budget: z.number().positive().optional(),
    rooms: z.number().min(1).max(8).optional(),
    city: z.string().max(60).optional(),
    goal: z.enum(['investment', 'living', 'any']).optional(),
    limit: z.number().int().min(1).max(15).optional()
});
const areaInput = z.object({ id: z.string().max(60) });
const listingsInput = z.object({
    area_id: z.string().max(60).optional(),
    city: z.string().max(60).optional(),
    max_price: z.number().positive().optional(),
    min_rooms: z.number().min(1).max(12).optional()
});

const TOOLS = [
    {
        name: 'search_areas',
        description:
            'Search neighborhoods across Israel, ranked by growth score. Filters by total budget in ILS (compared with the median price for the requested room count), rooms, city (Hebrew name or id), and goal. Returns id, city, neighborhood, score, trend, median price, estimated price for the rooms, 12-month and 3-year change, rent yield, gap to the city median, growth drivers, risks, coverage and data month.',
        input_schema: {
            type: 'object',
            properties: {
                budget: { type: 'number', description: 'Total budget in ILS, e.g. 1800000.' },
                rooms: { type: 'number', description: 'Number of rooms wanted, e.g. 4.' },
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
        description: 'Full details, score breakdown and recent price history of one neighborhood, by the id search_areas returned.',
        input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
        eager_input_streaming: true
    },
    {
        name: 'search_listings',
        description: 'Apartments for sale published by their owners, by neighborhood id or city, with optional max price and min rooms. Returns id, neighborhood, rooms, m², price, price per m², floor, street and description (no phone numbers).',
        input_schema: {
            type: 'object',
            properties: {
                area_id: { type: 'string' },
                city: { type: 'string' },
                max_price: { type: 'number' },
                min_rooms: { type: 'number' }
            },
            additionalProperties: false
        },
        eager_input_streaming: true
    },
    { type: 'web_search_20260209', name: 'web_search', max_uses: 3, user_location: { type: 'approximate', country: 'IL' } }
];

// What the model sees: the facts it needs, without map coordinates.
function forModel(area, { withHistory = false } = {}) {
    const { lat, lng, history, perRoom, nadlanId, trend, signalsCollected, cityMedian, ...rest } = area;
    return {
        ...rest,
        trend: trend.label,
        mediansByRooms: perRoom,
        cityMedian,
        growthDriversCollected: signalsCollected !== false,
        ...(withHistory && history ? { history: history.filter((_, i, all) => (all.length - 1 - i) % 6 === 0) } : {})
    };
}

async function runTool(block, ctx) {
    const schemas = { search_areas: searchInput, get_area: areaInput, search_listings: listingsInput };
    const schema = schemas[block.name];
    if (!schema) return { error: `Unknown tool ${block.name}` };
    const parsed = schema.safeParse(block.input);
    if (!parsed.success) return { error: `Invalid input: ${parsed.error.message}` };
    const input = parsed.data;

    if (block.name === 'search_areas') {
        const results = searchAreas(ctx.data.areas, input);
        return { areas: results.map((a) => a.id), result: { count: results.length, areas: results.map((a) => forModel(a)) } };
    }
    if (block.name === 'get_area') {
        const area = ctx.data.areas.find((a) => a.id === input.id);
        if (!area) return { error: `No neighborhood with id ${input.id}` };
        return { areas: [area.id], result: forModel(area, { withHistory: true }) };
    }
    const area = input.area_id ? ctx.data.areas.find((a) => a.id === input.area_id) : null;
    const listings = await searchListings(await ctx.db(), {
        areaId: input.area_id,
        city: input.city,
        maxPrice: input.max_price,
        minRooms: input.min_rooms,
        limit: 10
    });
    return {
        listings: listings.map((l) => l.id),
        result: { count: listings.length, neighborhoodMedian: area?.price ?? null, listings }
    };
}

// After a safety fallback mid-reply, only what came after the last fallback
// marker (plus plain text) can be sent back to the API.
function replayable(content) {
    const boundary = content.findLastIndex((b) => b.type === 'fallback');
    if (boundary < 0) return content;
    return content.filter((b, i) => i > boundary || b.type === 'text');
}

export async function* streamNadlanReply({ messages, signal, client = new Anthropic(), data, db = getDb }) {
    const ctx = { data: data ?? (await loadDataset()), db };
    const conversation = [...messages];
    const system = [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dataNote(ctx.data) }
    ];

    for (let round = 0; ; round += 1) {
        const stream = client.beta.messages.stream(
            {
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system,
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
            } else if (event.type === 'content_block_start' && ['tool_use', 'server_tool_use'].includes(event.content_block.type)) {
                yield { type: 'tool', name: event.content_block.name };
            }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') {
            yield { type: 'refused' };
            return;
        }
        const more = final.stop_reason === 'tool_use' || final.stop_reason === 'pause_turn';
        if (!more || round >= MAX_ROUNDS) {
            yield { type: final.stop_reason === 'end_turn' ? 'done' : 'truncated' };
            return;
        }

        const content = replayable(final.content);
        conversation.push({ role: 'assistant', content });
        // A paused server tool (web search) resumes by sending the turn back as is.
        if (final.stop_reason === 'pause_turn') continue;

        const results = [];
        for (const block of content.filter((b) => b.type === 'tool_use')) {
            const out = await runTool(block, ctx).catch((error) => ({ error: `Tool failed: ${error.message}` }));
            if (out.areas?.length) yield { type: 'areas', ids: out.areas };
            if (out.listings?.length) yield { type: 'listings', ids: out.listings };
            results.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(out.error ? { error: out.error } : out.result),
                ...(out.error ? { is_error: true } : {})
            });
        }
        conversation.push({ role: 'user', content: results });
    }
}
