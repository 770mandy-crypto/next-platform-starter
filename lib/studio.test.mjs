// Offline checks for the AI studio: provider calls against a fixture server,
// job records and polling, tool input validation, the edit builder, and the
// director's tool loop driven by a scripted stand-in for the Claude client.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

process.env.MASLUL_STORE = 'memory';

// --- Fixture provider server ----------------------------------------------

const requests = [];
const predictions = new Map();
let renderState = 'rendering';
let dubState = 'dubbing';

const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, url: req.url, headers: req.headers, body });
    const json = (status, value) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(value));
    };

    // Replicate
    let match = req.url.match(/^\/v1\/models\/([\w.-]+\/[\w.-]+)\/predictions$/);
    if (match && req.method === 'POST') {
        if (match[1] === 'broken/model') return json(422, { detail: 'input.prompt is required' });
        const id = `pred-${predictions.size + 1}`;
        predictions.set(id, { id, status: 'starting', output: null });
        return json(201, predictions.get(id));
    }
    match = req.url.match(/^\/v1\/predictions\/([\w-]+)$/);
    if (match) return json(200, predictions.get(match[1]) ?? { status: 'failed', error: 'missing' });

    // ElevenLabs
    if (req.url === '/v1/dubbing' && req.method === 'POST') {
        if (body.includes('name="target_lang"\r\n\r\nxx')) return json(400, { detail: 'unsupported language' });
        return json(200, { dubbing_id: `dub-${requests.length}`, expected_duration_sec: 30 });
    }
    match = req.url.match(/^\/v1\/dubbing\/([\w-]+)$/);
    if (match) return json(200, { dubbing_id: match[1], status: dubState });
    match = req.url.match(/^\/v1\/dubbing\/([\w-]+)\/audio\/(\w+)$/);
    if (match) {
        res.writeHead(200, { 'content-type': 'video/mp4' });
        return res.end(`dubbed ${match[2]}`);
    }
    if (req.url.startsWith('/v1/text-to-speech/')) {
        res.writeHead(200, { 'content-type': 'audio/mpeg' });
        return res.end(Buffer.from('ID3-fake-mp3'));
    }

    // Shotstack
    if (req.url === '/edit/stage/render' && req.method === 'POST')
        return json(201, { success: true, response: { id: 'render-1' } });
    if (req.url === '/edit/stage/render/render-1') {
        return json(200, {
            response: {
                status: renderState,
                ...(renderState === 'done' ? { url: 'https://cdn.example/edit.mp4' } : {})
            }
        });
    }
    json(404, { error: 'not found' });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
process.env.REPLICATE_HOST = base;
process.env.ELEVENLABS_HOST = base;
process.env.SHOTSTACK_HOST = base;
test.after(() => server.close());

const { resetMemoryDb } = await import('./pilot/db.js');
const catalog = await import('./studio/catalog.js');
const providers = await import('./studio/providers.js');
const jobs = await import('./studio/jobs.js');
const { runTool, studioTools, TOOL_NAMES } = await import('./studio/tools.js');
const { replayable, streamStudioReply } = await import('./studio/chat.js');

function connectAll() {
    process.env.ANTHROPIC_API_KEY = 'test';
    process.env.ELEVENLABS_API_KEY = 'el-key';
    process.env.REPLICATE_API_TOKEN = 'r8-key';
    process.env.SHOTSTACK_API_KEY = 'ss-key';
}

test.beforeEach(() => {
    resetMemoryDb();
    connectAll();
    requests.length = 0;
});

const context = { userId: 'user-1', origin: 'https://site.example' };

// --- Catalog and tools ------------------------------------------------------

test('every model has a valid default slug and an env override name', () => {
    for (const model of catalog.MODELS) {
        assert.match(model.slug, /^[\w.-]+\/[\w.-]+$/, model.id);
        assert.match(model.env, /^STUDIO_MODEL_[A-Z]+$/, model.id);
    }
    for (const kind of Object.values(catalog.DEFAULT_MODEL)) assert.ok(catalog.getModel(kind), kind);
});

test('tool definitions are plain JSON schemas Claude can read', () => {
    const tools = studioTools();
    assert.deepEqual(
        tools.map((tool) => tool.name),
        TOOL_NAMES
    );
    for (const tool of tools) {
        assert.equal(tool.input_schema.type, 'object', tool.name);
        assert.ok(tool.description.length > 40, tool.name);
        assert.equal(tool.eager_input_streaming, true);
        assert.equal(tool.input_schema.$schema, undefined);
    }
    const video = tools.find((tool) => tool.name === 'generate_video');
    assert.deepEqual(video.input_schema.required, ['prompt']);
    assert.deepEqual(video.input_schema.properties.model.enum, ['veo', 'kling', 'hailuo']);
});

test('invalid tool input is rejected before any provider is called', async () => {
    const bad = await runTool('dub_video', { source_url: 'file:///etc/passwd', target_languages: ['es'] }, context);
    assert.equal(bad.isError, true);
    assert.match(bad.result.issues.join(), /source_url/);
    const truncated = await runTool('generate_video', { prompt: 'a' }, context);
    assert.equal(truncated.isError, true);
    const unknown = await runTool('format_disk', {}, context);
    assert.equal(unknown.isError, true);
    assert.equal(requests.length, 0);
});

test('a provider without a key is reported to the model, not thrown', async () => {
    delete process.env.REPLICATE_API_TOKEN;
    const outcome = await runTool('generate_video', { prompt: 'a fox running in a forest' }, context);
    assert.equal(outcome.isError, true);
    assert.match(outcome.result.error, /REPLICATE_API_TOKEN/);
    assert.equal(requests.length, 0);
});

// --- Replicate -------------------------------------------------------------

test('each model gets only the fields it accepts, under its own names', () => {
    const fields = { prompt: 'p', image: 'https://x/a.png', duration: 5, aspect_ratio: '9:16', lyrics: 'la' };
    assert.deepEqual(providers.replicateInput('kling', fields), {
        prompt: 'p',
        start_image: 'https://x/a.png',
        duration: 5,
        aspect_ratio: '9:16'
    });
    assert.deepEqual(providers.replicateInput('hailuo', fields), {
        prompt: 'p',
        first_frame_image: 'https://x/a.png',
        duration: 5
    });
    assert.deepEqual(providers.replicateInput('flux', fields), { prompt: 'p', aspect_ratio: '9:16' });
    assert.deepEqual(providers.replicateInput('veo', { prompt: 'p', image: undefined, duration: '' }), { prompt: 'p' });
});

test('generate_video starts a prediction, and polling finishes the job', async () => {
    process.env.STUDIO_MODEL_KLING = 'acme/kling-next';
    try {
        const outcome = await runTool(
            'generate_video',
            { prompt: 'a fox running in a forest', model: 'kling', duration_seconds: 5 },
            context
        );
        assert.equal(outcome.isError, false);
        const [job] = outcome.jobs;
        assert.equal(job.status, 'running');
        assert.equal(job.url, null);
        assert.equal(job.input.model, 'Kling');

        const sent = requests.find((request) => request.method === 'POST');
        assert.equal(sent.url, '/v1/models/acme/kling-next/predictions');
        assert.equal(sent.headers.authorization, 'Bearer r8-key');
        assert.deepEqual(JSON.parse(sent.body), { input: { prompt: 'a fox running in a forest', duration: 5 } });

        // Within the check interval nothing is asked of the provider.
        const stored = await jobs.getJob(job.id);
        const before = requests.length;
        assert.equal((await jobs.refreshJob(stored, stored.checkedAt + 1000)).status, 'running');
        assert.equal(requests.length, before);

        predictions.get('pred-1').status = 'succeeded';
        predictions.get('pred-1').output = 'https://replicate.delivery/fox.mp4';
        const done = await jobs.refreshJob(stored, stored.checkedAt + jobs.CHECK_INTERVAL_MS);
        assert.equal(done.status, 'done');
        assert.equal(jobs.publicJob(done).url, 'https://replicate.delivery/fox.mp4');
        assert.equal(jobs.publicJob(done).owner, undefined);
    } finally {
        delete process.env.STUDIO_MODEL_KLING;
    }
});

test('a provider error comes back with its detail for the model to explain', async () => {
    process.env.STUDIO_MODEL_FLUX = 'broken/model';
    try {
        const outcome = await runTool('generate_image', { prompt: 'a red bicycle' }, context);
        assert.equal(outcome.isError, true);
        assert.match(outcome.result.error, /422/);
        assert.match(outcome.result.detail, /prompt is required/);
    } finally {
        delete process.env.STUDIO_MODEL_FLUX;
    }
});

test('a failed prediction is recorded as failed with its reason', async () => {
    const {
        jobs: [job]
    } = await runTool('generate_music', { prompt: 'calm lo-fi piano' }, context);
    Object.assign(predictions.get('pred-' + predictions.size), { status: 'failed', error: 'NSFW content detected' });
    const failed = await jobs.refreshJob(await jobs.getJob(job.id), Date.now() + jobs.CHECK_INTERVAL_MS);
    assert.equal(failed.status, 'failed');
    assert.equal(failed.error, 'NSFW content detected');
});

test('a job that never finishes is given up on after the timeout', async () => {
    const {
        jobs: [job]
    } = await runTool('generate_image', { prompt: 'a lighthouse at dusk' }, context);
    const stored = await jobs.getJob(job.id);
    const expired = await jobs.refreshJob(stored, stored.createdAt + jobs.JOB_TIMEOUT_MS + 1);
    assert.equal(expired.status, 'failed');
});

// --- ElevenLabs ------------------------------------------------------------

test('dub_video starts one job per language and keeps going past a failure', async () => {
    const outcome = await runTool(
        'dub_video',
        {
            source_url: 'https://cdn.example/talk.mp4',
            target_languages: ['en', 'xx', 'es', 'en'],
            source_language: 'he'
        },
        context
    );
    assert.equal(outcome.isError, false);
    assert.deepEqual(
        outcome.jobs.map((job) => [job.input.language, job.status]),
        [
            ['en', 'running'],
            ['xx', 'failed'],
            ['es', 'running']
        ]
    );
    assert.match(outcome.jobs[1].error, /unsupported language/);

    const sent = requests.filter((request) => request.url === '/v1/dubbing');
    assert.equal(sent.length, 3);
    assert.equal(sent[0].headers['xi-api-key'], 'el-key');
    assert.match(sent[0].body, /name="source_url"\r\n\r\nhttps:\/\/cdn\.example\/talk\.mp4/);
    assert.match(sent[0].body, /name="source_lang"\r\n\r\nhe/);

    // A finished dub is served through our own route, which needs the key.
    dubState = 'dubbed';
    try {
        const stored = await jobs.getJob(outcome.jobs[0].id);
        const done = await jobs.refreshJob(stored, Date.now() + jobs.CHECK_INTERVAL_MS);
        assert.equal(done.status, 'done');
        assert.equal(jobs.publicJob(done, context.origin).url, `https://site.example/api/studio/files/${done.id}`);
        const file = await providers.fetchDubbedFile(done.providerId, 'en');
        assert.equal(await file.text(), 'dubbed en');
    } finally {
        dubState = 'dubbing';
    }
});

test('a voice-over is stored and done in one call', async () => {
    const outcome = await runTool('create_voiceover', { text: 'שלום וברוכים הבאים' }, context);
    const [job] = outcome.jobs;
    assert.equal(job.status, 'done');
    assert.equal(job.url, `https://site.example/api/studio/files/${job.id}`);
    const audio = await jobs.loadAudio(job.id);
    assert.equal(audio.data.toString(), 'ID3-fake-mp3');
    const sent = requests.find((request) => request.url.startsWith('/v1/text-to-speech/'));
    assert.match(sent.url, new RegExp(`/${providers.DEFAULT_VOICE_ID}\\?output_format=mp3_44100_128$`));
    assert.equal(JSON.parse(sent.body).text, 'שלום וברוכים הבאים');
});

// --- Shotstack -------------------------------------------------------------

test('the edit builder lays clips end to end under titles, with music and narration', () => {
    const edit = providers.buildEdit({
        clips: [
            { url: 'https://x/1.mp4', length: 4, transition: 'fade' },
            { url: 'https://x/2.mp4', length: 6, trim: 2, mute: true }
        ],
        music: 'https://x/m.mp3',
        voiceover: 'https://x/v.mp3',
        titles: [{ text: 'פתיחה', start: 0, length: 3 }],
        aspectRatio: '9:16'
    });
    const [titles, video, narration] = edit.timeline.tracks;
    assert.equal(titles.clips[0].asset.text, 'פתיחה');
    assert.deepEqual(
        video.clips.map((clip) => [clip.start, clip.length]),
        [
            [0, 4],
            [4, 6]
        ]
    );
    assert.deepEqual(video.clips[1].asset, { type: 'video', src: 'https://x/2.mp4', trim: 2, volume: 0 });
    assert.equal(narration.clips[0].length, 10);
    assert.equal(edit.timeline.soundtrack.volume, 0.3);
    assert.deepEqual(edit.output, { format: 'mp4', resolution: 'hd', aspectRatio: '9:16' });
});

test('edit_video renders on Shotstack and polling picks up the result', async () => {
    const outcome = await runTool(
        'edit_video',
        { clips: [{ url: 'https://x/1.mp4', length: 5 }], titles: [] },
        context
    );
    const [job] = outcome.jobs;
    assert.equal(job.kind, 'edit');
    const sent = requests.find((request) => request.url === '/edit/stage/render');
    assert.equal(sent.headers['x-api-key'], 'ss-key');

    renderState = 'done';
    try {
        const done = await jobs.refreshJob(await jobs.getJob(job.id), Date.now() + jobs.CHECK_INTERVAL_MS);
        assert.equal(done.url, 'https://cdn.example/edit.mp4');
    } finally {
        renderState = 'rendering';
    }
});

// --- Jobs ------------------------------------------------------------------

test("a user lists only their own jobs, newest first, and can't read another's", async () => {
    const first = await jobs.createJob('user-1', { kind: 'image', provider: 'replicate', title: 'a', input: {} }, 1000);
    const second = await jobs.createJob(
        'user-1',
        { kind: 'image', provider: 'replicate', title: 'b', input: {} },
        2000
    );
    const other = await jobs.createJob('user-2', { kind: 'image', provider: 'replicate', title: 'c', input: {} }, 3000);
    assert.deepEqual(
        (await jobs.listJobs('user-1')).map((job) => job.id),
        [second.id, first.id]
    );
    assert.equal(await jobs.getOwnJob('user-1', other.id), null);
    assert.equal(await jobs.getJob('../../etc/passwd'), null);
});

test('the daily job limit stops paid calls', async () => {
    const limit = jobs.JOB_DAILY_LIMIT;
    for (let i = 0; i < limit; i += 1) await jobs.consumeJobQuota('user-9');
    await assert.rejects(jobs.consumeJobQuota('user-9'), jobs.JobLimitError);
    const outcome = await runTool(
        'generate_image',
        { prompt: 'a lighthouse at dusk' },
        { ...context, userId: 'user-9' }
    );
    assert.equal(outcome.isError, true);
    assert.match(outcome.result.error, /מכסה/);
});

// --- The director's tool loop ---------------------------------------------

// A stand-in for the Anthropic client: each call to stream() plays the next
// scripted turn as stream events and resolves finalMessage() to it.
function scriptedClient(turns) {
    const calls = [];
    return {
        calls,
        beta: {
            messages: {
                stream(params) {
                    calls.push(structuredClone(params));
                    const turn = turns.shift();
                    const events = turn.content.flatMap((block, index) =>
                        block.type === 'text'
                            ? [
                                  { type: 'content_block_start', index, content_block: { type: 'text', text: '' } },
                                  {
                                      type: 'content_block_delta',
                                      index,
                                      delta: { type: 'text_delta', text: block.text }
                                  }
                              ]
                            : [{ type: 'content_block_start', index, content_block: block }]
                    );
                    return {
                        async *[Symbol.asyncIterator]() {
                            yield* events;
                        },
                        finalMessage: async () => turn
                    };
                }
            }
        }
    };
}

async function collect(generator) {
    const events = [];
    for await (const event of generator) events.push(event);
    return events;
}

test('the director calls a tool, gets its job back, and finishes the reply', async () => {
    const client = scriptedClient([
        {
            stop_reason: 'tool_use',
            content: [
                { type: 'thinking', thinking: '', signature: 'sig' },
                { type: 'text', text: 'מתחיל.' },
                {
                    type: 'tool_use',
                    id: 'tu_1',
                    name: 'generate_image',
                    input: { prompt: 'a cozy cafe storefront', title: 'חזית' }
                }
            ]
        },
        { stop_reason: 'end_turn', content: [{ type: 'text', text: 'התמונה בדרך.' }] }
    ]);
    const messages = [{ role: 'user', content: 'צור תמונה של בית קפה' }];
    const events = await collect(streamStudioReply({ messages, context, client }));

    assert.deepEqual(
        events.map((event) => event.type),
        ['text', 'tool', 'tool_result', 'job', 'text', 'done']
    );
    assert.equal(events.find((event) => event.type === 'job').job.title, 'חזית');

    const [first, second] = client.calls;
    assert.equal(first.model, 'claude-opus-5-5');
    assert.equal(first.tools.length, TOOL_NAMES.length);
    // The second request carries the whole first turn (thinking included) and
    // the tool's result.
    assert.equal(second.messages.length, 3);
    assert.equal(second.messages[1].content[0].type, 'thinking');
    const [result] = second.messages[2].content;
    assert.equal(result.tool_use_id, 'tu_1');
    assert.equal(result.is_error, undefined);
    assert.equal(JSON.parse(result.content).jobs[0].status, 'running');
    // The caller's array is not mutated.
    assert.equal(messages.length, 1);
});

test('a truncated or refused turn never runs its tools', async () => {
    for (const stop_reason of ['max_tokens', 'refusal']) {
        const client = scriptedClient([
            {
                stop_reason,
                content: [{ type: 'tool_use', id: 'tu_1', name: 'generate_image', input: { prompt: 'a cafe' } }]
            }
        ]);
        const events = await collect(
            streamStudioReply({ messages: [{ role: 'user', content: 'x' }], context, client })
        );
        assert.equal(events.at(-1).type, stop_reason === 'refusal' ? 'refused' : 'truncated');
        assert.ok(!events.some((event) => event.type === 'tool_result'));
    }
    assert.equal(requests.length, 0);
});

test('the tool loop stops after its round cap', async () => {
    const turn = () => ({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'tu', name: 'list_jobs', input: {} }]
    });
    const client = scriptedClient(Array.from({ length: 10 }, turn));
    const events = await collect(streamStudioReply({ messages: [{ role: 'user', content: 'x' }], context, client }));
    assert.equal(events.at(-1).type, 'truncated');
    assert.equal(client.calls.length, 6);
});

test('after a fallback only the continuing model’s blocks are replayed in full', () => {
    const content = [
        { type: 'thinking', thinking: '' },
        { type: 'text', text: 'before' },
        { type: 'tool_use', id: 'a', name: 'list_jobs', input: {} },
        { type: 'fallback', from: {}, to: {} },
        { type: 'thinking', thinking: '' },
        { type: 'tool_use', id: 'b', name: 'list_jobs', input: {} }
    ];
    assert.deepEqual(
        replayable(content).map((block) => block.id ?? block.type),
        ['text', 'thinking', 'b']
    );
    assert.equal(replayable(content.slice(0, 3)).length, 3);
});
