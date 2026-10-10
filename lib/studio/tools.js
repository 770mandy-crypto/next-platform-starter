// The tools Claude uses to run the studio. Each tool is a Zod schema (which
// also becomes the JSON schema Claude sees) and a function that starts the
// work with a provider and records it as a job. No tool waits for a result:
// it returns the job, the page shows it and polls until it is done, and in a
// later turn Claude can call list_jobs to pick up the finished files.

import { z } from 'zod';
import { DEFAULT_MODEL, getModel, JOB_KINDS, languageName, modelsOfKind, SOUND_MODELS } from './catalog.js';
import { consumeJobQuota, createJob, listJobs, markDone, publicJob, refreshJob, saveFile } from './jobs.js';
import { buildEdit, ProviderError, startDub, startRender, startReplicate, synthesizeSpeech } from './providers.js';

const url = z
    .string()
    .max(2000)
    .refine((value) => {
        try {
            return ['https:', 'http:'].includes(new URL(value).protocol);
        } catch {
            return false;
        }
    }, 'must be an http(s) URL');

const ids = (kind) => modelsOfKind(kind).map((model) => model.id);
const aspect = z.enum(['16:9', '9:16', '1:1']);
const language = z.string().regex(/^[a-z]{2,3}(-[A-Za-z]{2})?$/, 'an ISO 639-1 language code such as en, he, es');

const SCHEMAS = {
    generate_video: z.object({
        prompt: z
            .string()
            .min(3)
            .max(2000)
            .describe('A detailed English description of the shot: subject, action, camera, lighting, style.'),
        model: z.enum(ids('video')).optional().describe('Which video model to use. Omit for the default.'),
        image_url: url
            .optional()
            .describe('A still to animate (image-to-video), e.g. the url of a finished generate_image job.'),
        duration_seconds: z.number().int().min(2).max(10).optional(),
        aspect_ratio: aspect.optional(),
        title: z.string().max(120).optional().describe('A short Hebrew label for the job card.')
    }),
    generate_image: z.object({
        prompt: z.string().min(3).max(2000).describe('A detailed English description of the image.'),
        aspect_ratio: aspect.optional(),
        title: z.string().max(120).optional()
    }),
    generate_music: z.object({
        prompt: z.string().min(3).max(600).describe('Genre, mood, instruments and tempo, in English.'),
        lyrics: z.string().max(2000).optional().describe('Song lyrics, if the music should have vocals.'),
        title: z.string().max(120).optional()
    }),
    animate_character: z
        .object({
            audio_url: url.describe(
                'The speech the character says: the url of a finished create_voiceover job, or another public audio link.'
            ),
            image_url: url
                .optional()
                .describe('A still of the character (face clearly visible) to bring to life. Use this OR video_url.'),
            video_url: url
                .optional()
                .describe(
                    'An existing clip of the character whose lips should be re-synced to the new speech. Use this OR image_url.'
                ),
            title: z.string().max(120).optional()
        })
        .refine(
            (value) => Boolean(value.image_url) !== Boolean(value.video_url),
            'give exactly one of image_url or video_url'
        ),
    dub_video: z.object({
        source_url: url.describe('A public link to the video or audio file to dub.'),
        target_languages: z.array(language).min(1).max(8).describe('ISO 639-1 codes of the languages to dub into.'),
        source_language: language.optional().describe('The language spoken in the source. Omit to detect it.'),
        speakers: z.number().int().min(0).max(10).optional().describe('Number of speakers; 0 or omitted to detect.'),
        title: z.string().max(120).optional()
    }),
    create_voiceover: z.object({
        text: z
            .string()
            .min(1)
            .max(3000)
            .describe('The exact words to speak, in the language they should be spoken in.'),
        voice_id: z
            .string()
            .regex(/^[A-Za-z0-9]{10,40}$/)
            .optional()
            .describe('An ElevenLabs voice id. Omit for the default voice.'),
        title: z.string().max(120).optional()
    }),
    edit_video: z.object({
        clips: z
            .array(
                z.object({
                    url: url,
                    length: z.number().min(0.5).max(300).describe('Seconds of this clip to use.'),
                    trim: z.number().min(0).max(3600).optional().describe('Seconds to skip at the start of the clip.'),
                    mute: z.boolean().optional().describe("Silence the clip's own sound."),
                    transition: z.enum(['fade', 'wipeLeft', 'wipeRight', 'slideLeft', 'slideRight', 'zoom']).optional()
                })
            )
            .min(1)
            .max(30)
            .describe('Clips in playing order.'),
        music_url: url.optional().describe('Background music for the whole video.'),
        voiceover_url: url.optional().describe('Narration laid over the whole video.'),
        titles: z
            .array(
                z.object({
                    text: z.string().min(1).max(200),
                    start: z.number().min(0),
                    length: z.number().min(0.5).max(60),
                    position: z.enum(['top', 'center', 'bottom']).optional()
                })
            )
            .max(40)
            .optional()
            .describe('On-screen text or subtitles, timed in seconds from the start of the video.'),
        aspect_ratio: aspect.optional(),
        resolution: z.enum(['sd', 'hd', '1080']).optional(),
        title: z.string().max(120).optional()
    }),
    list_jobs: z.object({
        limit: z.number().int().min(1).max(30).optional()
    })
};

const DESCRIPTIONS = {
    generate_video: `Start generating a short video clip (a few seconds) from a text prompt, optionally animating a still image. Returns a job; the clip is ready in one to several minutes. For a longer video, plan several shots and generate each, then join them with edit_video. Models with built-in sound (${SOUND_MODELS.join(', ')}) also generate the soundtrack: spoken dialogue with matching lip movement, sound effects and ambience, all described in the prompt. The other models make silent clips.`,
    generate_image:
        'Start generating a still image: a storyboard frame, a character, a background, a thumbnail, or a first frame to animate with generate_video.',
    generate_music: 'Start generating background music or a song from a description (and optional lyrics).',
    animate_character:
        'Make a character talk and move: from a still image of the character plus a speech audio file, generate a video where the lips, face, head and hands move with the words (talking avatar); or re-sync the lips of an existing clip to new speech. Get the speech first with create_voiceover. Each call makes one spoken line, as long as the audio.',
    dub_video:
        "Dub an existing video or audio file into one or more other languages, keeping the original speakers' voices. Starts one job per language. The source must be a public link the dubbing service can download.",
    create_voiceover: 'Turn a script into spoken narration (text to speech), in any language the text is written in.',
    edit_video:
        'Edit finished clips into one video on a cloud editor: clips in order, optional trims, transitions, a music bed, a narration track and timed on-screen titles or subtitles. All media must be public links, such as the urls of finished jobs.',
    list_jobs:
        "List the user's recent studio jobs with their current status and, for finished jobs, the url of the result. Use it to find files from earlier work before editing them together."
};

export const TOOL_NAMES = Object.keys(SCHEMAS);

// The tool definitions sent to Claude. Inputs stream as they are generated, so
// every input is validated against its schema before anything runs.
export function studioTools() {
    return TOOL_NAMES.map((name) => {
        const { $schema, ...input_schema } = z.toJSONSchema(SCHEMAS[name]);
        return { name, description: DESCRIPTIONS[name], input_schema, eager_input_streaming: true };
    });
}

// Runs one tool call. Returns what goes back to Claude (a JSON-able object),
// whether it is an error, and the jobs it touched for the page to show.
export async function runTool(name, rawInput, context) {
    const schema = SCHEMAS[name];
    if (!schema) return { isError: true, result: { error: `Unknown tool ${name}.` }, jobs: [] };
    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
        return {
            isError: true,
            result: {
                error: 'Invalid input.',
                issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            },
            jobs: []
        };
    }
    try {
        const jobs = await HANDLERS[name](parsed.data, context);
        const shown = jobs.map((job) => publicJob(job, context.origin));
        return { isError: false, result: { jobs: shown.map(forModel) }, jobs: shown };
    } catch (error) {
        if (error instanceof ProviderError || error?.status) {
            return {
                isError: true,
                result: { error: error.message, ...(error.detail ? { detail: error.detail } : {}) },
                jobs: []
            };
        }
        throw error;
    }
}

// What Claude sees of a job: enough to report on it and to reuse its file.
function forModel(job) {
    return {
        id: job.id,
        kind: job.kind,
        title: job.title,
        status: job.status,
        ...(job.url ? { url: job.url } : {}),
        ...(job.error ? { error: job.error } : {})
    };
}

const defaultTitle = (kind, text) => `${JOB_KINDS[kind].label}: ${String(text).slice(0, 60)}`;

async function replicateJob(kind, modelId, fields, input, title, { userId }) {
    await consumeJobQuota(userId);
    const started = await startReplicate(modelId, fields);
    return createJob(userId, {
        kind,
        provider: 'replicate',
        title,
        input: { ...input, model: getModel(modelId).label },
        providerId: started.providerId,
        status: started.status,
        url: started.url ?? null,
        error: started.error ?? null
    });
}

const HANDLERS = {
    async generate_video(input, context) {
        const modelId = input.model ?? DEFAULT_MODEL.video;
        const fields = {
            prompt: input.prompt,
            image: input.image_url,
            duration: input.duration_seconds,
            aspect_ratio: input.aspect_ratio
        };
        const title = input.title || defaultTitle('video', input.prompt);
        return [await replicateJob('video', modelId, fields, { prompt: input.prompt }, title, context)];
    },

    async generate_image(input, context) {
        const fields = { prompt: input.prompt, aspect_ratio: input.aspect_ratio };
        const title = input.title || defaultTitle('image', input.prompt);
        return [await replicateJob('image', DEFAULT_MODEL.image, fields, { prompt: input.prompt }, title, context)];
    },

    async generate_music(input, context) {
        const fields = { prompt: input.prompt, lyrics: input.lyrics };
        const title = input.title || defaultTitle('music', input.prompt);
        return [await replicateJob('music', DEFAULT_MODEL.music, fields, { prompt: input.prompt }, title, context)];
    },

    async animate_character(input, context) {
        const modelId = input.image_url ? DEFAULT_MODEL.avatar : DEFAULT_MODEL.lipsync;
        const fields = { image: input.image_url, video: input.video_url, audio: input.audio_url };
        const title = input.title || (input.image_url ? 'דמות מדברת' : 'סנכרון שפתיים');
        return [await replicateJob('character', modelId, fields, {}, title, context)];
    },

    // One job per language, so each dub can be followed and downloaded on its
    // own. Languages that fail to start are reported without stopping the rest.
    async dub_video(input, { userId }) {
        const jobs = [];
        for (const lang of [...new Set(input.target_languages)]) {
            await consumeJobQuota(userId);
            const title = `${input.title || 'דיבוב'} → ${languageName(lang)}`;
            const record = { source: input.source_url, language: lang };
            try {
                const started = await startDub({
                    sourceUrl: input.source_url,
                    targetLang: lang,
                    sourceLang: input.source_language,
                    speakers: input.speakers,
                    name: title
                });
                jobs.push(
                    await createJob(userId, {
                        kind: 'dub',
                        provider: 'elevenlabs',
                        title,
                        input: record,
                        providerId: started.providerId
                    })
                );
            } catch (error) {
                if (!(error instanceof ProviderError)) throw error;
                jobs.push(
                    await createJob(userId, {
                        kind: 'dub',
                        provider: 'elevenlabs',
                        title,
                        input: record,
                        status: 'failed',
                        error: [error.message, error.detail].filter(Boolean).join(' ').slice(0, 400)
                    })
                );
            }
        }
        return jobs;
    },

    async create_voiceover(input, { userId }) {
        await consumeJobQuota(userId);
        const audio = await synthesizeSpeech({ text: input.text, voiceId: input.voice_id });
        const job = await createJob(userId, {
            kind: 'voiceover',
            provider: 'elevenlabs',
            title: input.title || defaultTitle('voiceover', input.text),
            input: { text: input.text.slice(0, 300) },
            status: 'running'
        });
        await saveFile(job.id, audio, 'audio/mpeg');
        // The job is written before its audio and marked done only after, so a
        // poll in between never links to a file that is not there yet.
        return [await markDone(job)];
    },

    async edit_video(input, { userId }) {
        await consumeJobQuota(userId);
        const edit = buildEdit({
            clips: input.clips,
            music: input.music_url,
            voiceover: input.voiceover_url,
            titles: input.titles,
            aspectRatio: input.aspect_ratio,
            resolution: input.resolution
        });
        const started = await startRender(edit);
        const seconds = input.clips.reduce((sum, clip) => sum + clip.length, 0);
        return [
            await createJob(userId, {
                kind: 'edit',
                provider: 'shotstack',
                title: input.title || `עריכה: ${input.clips.length} קליפים, ${Math.round(seconds)} שניות`,
                input: { clips: input.clips.length, seconds },
                providerId: started.providerId
            })
        ];
    },

    async list_jobs(input, { userId }) {
        const jobs = await listJobs(userId, input.limit ?? 15);
        return Promise.all(jobs.map((job) => refreshJob(job)));
    }
};
