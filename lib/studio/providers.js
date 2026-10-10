// The outside services the studio drives, each behind the same two calls:
// start(...) begins a piece of work and returns the provider's own id for it,
// and check(...) reports where it stands. Every job here takes minutes, longer
// than a serverless function may run, so nothing waits for a result: the page
// polls /api/studio/jobs, which calls check() for jobs still running.
//
// check() answers { status: 'running' | 'done' | 'failed', url?, error? }.
//
// Hosts can be pointed at fixture servers (REPLICATE_HOST and friends), which
// is how the tests exercise this file without network access or keys.

import { getModel, PROVIDERS } from './catalog.js';

const TIMEOUT_MS = 20_000;

const host = (name, fallback) => (process.env[name] || fallback).replace(/\/$/, '');
const replicateHost = () => host('REPLICATE_HOST', 'https://api.replicate.com');
const elevenHost = () => host('ELEVENLABS_HOST', 'https://api.elevenlabs.io');
const shotstackHost = () => host('SHOTSTACK_HOST', 'https://api.shotstack.io');

export class ProviderError extends Error {
    constructor(message, { status = 502, detail = null } = {}) {
        super(message);
        this.status = status;
        this.detail = detail;
    }
}

export function providerKey(id) {
    const provider = PROVIDERS.find((item) => item.id === id);
    return provider ? process.env[provider.env] || null : null;
}

export function isConnected(id) {
    return Boolean(providerKey(id));
}

export function providerStatus() {
    return PROVIDERS.map(({ id, label, env, role, signup }) => ({
        id,
        label,
        env,
        role,
        signup,
        connected: isConnected(id)
    }));
}

function requireKey(id) {
    const key = providerKey(id);
    if (!key) {
        const provider = PROVIDERS.find((item) => item.id === id);
        throw new ProviderError(`${provider.label} לא מחובר: צריך להגדיר את ${provider.env} בהגדרות האתר.`, {
            status: 503
        });
    }
    return key;
}

// One request to a provider, with a timeout and the provider's own error text
// kept (trimmed) so the model can tell the user what actually went wrong.
// The timeout covers reading the body too, so a download gets a longer one.
async function call(url, { label, timeoutMs = TIMEOUT_MS, ...init }) {
    let response;
    try {
        response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
        throw new ProviderError(`${label} לא ענה. נסו שוב בעוד רגע.`, { detail: error?.message ?? null });
    }
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new ProviderError(`${label} החזיר שגיאה ${response.status}.`, {
            status: response.status === 429 ? 429 : 502,
            detail: text.slice(0, 400) || null
        });
    }
    return response;
}

async function callJson(url, init) {
    const response = await call(url, init);
    try {
        return await response.json();
    } catch {
        throw new ProviderError(`${init.label} החזיר תשובה לא תקינה.`);
    }
}

// --- Replicate: video, image and music models ------------------------------

// The studio's generic fields, renamed to what each model calls them. Fields a
// model does not take are dropped rather than sent.
const FIELD_NAMES = {
    kling: { image: 'start_image' },
    hailuo: { image: 'first_frame_image' }
};

export function replicateInput(modelId, fields) {
    const model = getModel(modelId);
    const rename = FIELD_NAMES[modelId] ?? {};
    const input = {};
    for (const field of model.input) {
        const value = fields[field];
        if (value === undefined || value === null || value === '') continue;
        input[rename[field] ?? field] = value;
    }
    return input;
}

export function modelSlug(modelId) {
    const model = getModel(modelId);
    return (process.env[model.env] || model.slug).trim();
}

export async function startReplicate(modelId, fields) {
    const token = requireKey('replicate');
    const slug = modelSlug(modelId);
    if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) throw new ProviderError(`שם המודל ${slug} אינו תקין.`, { status: 500 });
    const prediction = await callJson(`${replicateHost()}/v1/models/${slug}/predictions`, {
        label: 'Replicate',
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ input: replicateInput(modelId, fields) })
    });
    if (!prediction?.id) throw new ProviderError('Replicate לא החזיר מזהה עבודה.');
    return { providerId: prediction.id, ...replicateState(prediction) };
}

export async function checkReplicate(providerId) {
    const token = requireKey('replicate');
    const prediction = await callJson(`${replicateHost()}/v1/predictions/${encodeURIComponent(providerId)}`, {
        label: 'Replicate',
        headers: { authorization: `Bearer ${token}` }
    });
    return replicateState(prediction);
}

function replicateState(prediction) {
    if (prediction.status === 'succeeded') {
        const output = Array.isArray(prediction.output) ? prediction.output : [prediction.output];
        const urls = output.filter((item) => typeof item === 'string' && /^https?:\/\//.test(item));
        if (!urls.length) return { status: 'failed', error: 'המודל סיים בלי להחזיר קובץ.' };
        return { status: 'done', url: urls[0], urls };
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
        return { status: 'failed', error: String(prediction.error || 'המודל נכשל.').slice(0, 400) };
    }
    return { status: 'running' };
}

// --- ElevenLabs: dubbing and voice-over -----------------------------------

export async function startDub({ sourceUrl, targetLang, sourceLang, speakers, name }) {
    const key = requireKey('elevenlabs');
    const form = new FormData();
    form.set('source_url', sourceUrl);
    form.set('target_lang', targetLang);
    form.set('source_lang', sourceLang || 'auto');
    form.set('num_speakers', String(speakers ?? 0));
    if (name) form.set('name', name);
    const result = await callJson(`${elevenHost()}/v1/dubbing`, {
        label: 'ElevenLabs',
        method: 'POST',
        headers: { 'xi-api-key': key },
        body: form
    });
    if (!result?.dubbing_id) throw new ProviderError('ElevenLabs לא החזיר מזהה דיבוב.');
    return { providerId: result.dubbing_id, status: 'running', expectedSeconds: result.expected_duration_sec ?? null };
}

export async function checkDub(providerId) {
    const key = requireKey('elevenlabs');
    const result = await callJson(`${elevenHost()}/v1/dubbing/${encodeURIComponent(providerId)}`, {
        label: 'ElevenLabs',
        headers: { 'xi-api-key': key }
    });
    if (result.status === 'dubbed') return { status: 'done' };
    if (result.status === 'failed')
        return { status: 'failed', error: String(result.error || 'הדיבוב נכשל.').slice(0, 400) };
    return { status: 'running' };
}

// The dubbed file is only available with the API key, so it is streamed to the
// browser through our own route instead of being linked directly.
export async function fetchDubbedFile(providerId, language) {
    const key = requireKey('elevenlabs');
    return call(`${elevenHost()}/v1/dubbing/${encodeURIComponent(providerId)}/audio/${encodeURIComponent(language)}`, {
        label: 'ElevenLabs',
        timeoutMs: 10 * 60_000,
        headers: { 'xi-api-key': key }
    });
}

// A premade ElevenLabs voice that works on every account.
export const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

// Voice-over is fast enough to run within the request; the audio comes back
// as bytes and is stored with the job.
export async function synthesizeSpeech({ text, voiceId }) {
    const key = requireKey('elevenlabs');
    const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
    const response = await call(
        `${elevenHost()}/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
        {
            label: 'ElevenLabs',
            timeoutMs: 60_000,
            method: 'POST',
            headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
            body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_v3' })
        }
    );
    return Buffer.from(await response.arrayBuffer());
}

// --- Shotstack: cloud video editing ---------------------------------------

// "stage" is Shotstack's free sandbox (watermarked output); set SHOTSTACK_ENV=v1
// with a production key for clean renders.
const shotstackEnv = () => (process.env.SHOTSTACK_ENV === 'v1' ? 'v1' : 'stage');

export async function startRender(edit) {
    const key = requireKey('shotstack');
    const result = await callJson(`${shotstackHost()}/edit/${shotstackEnv()}/render`, {
        label: 'Shotstack',
        method: 'POST',
        headers: { 'x-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify(edit)
    });
    const id = result?.response?.id;
    if (!id) throw new ProviderError('Shotstack לא החזיר מזהה עריכה.', { detail: result?.message ?? null });
    return { providerId: id, status: 'running' };
}

export async function checkRender(providerId) {
    const key = requireKey('shotstack');
    const result = await callJson(
        `${shotstackHost()}/edit/${shotstackEnv()}/render/${encodeURIComponent(providerId)}`,
        {
            label: 'Shotstack',
            headers: { 'x-api-key': key }
        }
    );
    const render = result?.response ?? {};
    if (render.status === 'done' && render.url) return { status: 'done', url: render.url };
    if (render.status === 'failed')
        return { status: 'failed', error: String(render.error || 'העריכה נכשלה.').slice(0, 400) };
    return { status: 'running' };
}

// Builds a Shotstack edit from the studio's simple description: clips played
// one after another, an optional music bed and voice-over, and text titles.
export function buildEdit({ clips, music, voiceover, titles = [], aspectRatio = '16:9', resolution = 'hd' }) {
    let cursor = 0;
    const videoClips = clips.map((clip) => {
        const placed = {
            asset: {
                type: 'video',
                src: clip.url,
                ...(clip.trim ? { trim: clip.trim } : {}),
                ...(clip.mute ? { volume: 0 } : {})
            },
            start: cursor,
            length: clip.length,
            ...(clip.transition ? { transition: { in: clip.transition, out: clip.transition } } : {})
        };
        cursor += clip.length;
        return placed;
    });

    // Shotstack draws the first track on top.
    const tracks = [];
    if (titles.length) {
        tracks.push({
            clips: titles.map((title) => ({
                asset: {
                    type: 'title',
                    text: title.text,
                    style: 'minimal',
                    size: title.size ?? 'medium',
                    position: title.position ?? 'bottom'
                },
                start: title.start,
                length: title.length
            }))
        });
    }
    tracks.push({ clips: videoClips });
    if (voiceover)
        tracks.push({ clips: [{ asset: { type: 'audio', src: voiceover, volume: 1 }, start: 0, length: cursor }] });

    return {
        timeline: {
            ...(music ? { soundtrack: { src: music, effect: 'fadeOut', volume: voiceover ? 0.3 : 1 } } : {}),
            tracks
        },
        output: { format: 'mp4', resolution, aspectRatio }
    };
}
