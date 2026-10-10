// What the AI studio can do and which outside services do it. Safe to ship to
// the browser: no keys, no prompts.
//
// Each capability is served by one provider. A provider is "connected" when its
// API key is set on the server (see lib/studio/providers.js); the page shows
// which are, and the chat tells the user what to connect when one is missing.
//
// Generative models run through Replicate, which gives one key access to many
// vendors' models. Model slugs on Replicate change as vendors release new
// versions, so every slug here can be overridden with an environment variable
// without touching code (the variable name is listed with each model).

export const PROVIDERS = [
    {
        id: 'anthropic',
        label: 'Claude (Anthropic)',
        env: 'ANTHROPIC_API_KEY',
        role: 'המוח של הסטודיו: מנהל את השיחה, כותב תסריטים, סטוריבורד, תרגומים וכתוביות, ומפעיל את שאר הכלים.',
        signup: 'https://console.anthropic.com/'
    },
    {
        id: 'elevenlabs',
        label: 'ElevenLabs',
        env: 'ELEVENLABS_API_KEY',
        role: 'דיבוב סרטונים לשפות אחרות בקול של הדובר המקורי, וקריינות (טקסט לדיבור) בעשרות שפות.',
        signup: 'https://elevenlabs.io/app/settings/api-keys'
    },
    {
        id: 'replicate',
        label: 'Replicate',
        env: 'REPLICATE_API_TOKEN',
        role: 'מפתח אחד למודלי הווידאו, התמונה והמוזיקה המובילים (Veo, Kling, Hailuo, Flux ועוד).',
        signup: 'https://replicate.com/account/api-tokens'
    },
    {
        id: 'shotstack',
        label: 'Shotstack',
        env: 'SHOTSTACK_API_KEY',
        role: 'עריכת וידאו בענן: חיבור קליפים, חיתוך, מוזיקה, קריינות וכותרות לסרטון אחד מוכן.',
        signup: 'https://dashboard.shotstack.io/'
    }
];

// kind: what the model makes. input: which of the studio's generic fields the
// model accepts, so a request never sends a field a model would reject.
export const MODELS = [
    {
        id: 'veo',
        label: 'Google Veo',
        kind: 'video',
        slug: 'google/veo-3.1',
        env: 'STUDIO_MODEL_VEO',
        note: 'איכות קולנועית, עם סאונד מובנה: דיבור עם שפתיים מסונכרנות, אפקטים ורעשי רקע.',
        sound: true,
        input: ['prompt', 'image', 'duration', 'aspect_ratio']
    },
    {
        id: 'kling',
        label: 'Kling',
        kind: 'video',
        slug: 'kwaivgi/kling-v2.1-master',
        env: 'STUDIO_MODEL_KLING',
        note: 'תנועה ריאליסטית, טוב להנפשת תמונה.',
        input: ['prompt', 'image', 'duration', 'aspect_ratio']
    },
    {
        id: 'hailuo',
        label: 'MiniMax Hailuo',
        kind: 'video',
        slug: 'minimax/hailuo-02-fast',
        env: 'STUDIO_MODEL_HAILUO',
        note: 'מהיר וזול יחסית, טוב לטיוטות.',
        input: ['prompt', 'image', 'duration']
    },
    {
        id: 'flux',
        label: 'FLUX',
        kind: 'image',
        slug: 'black-forest-labs/flux-1.1-pro',
        env: 'STUDIO_MODEL_FLUX',
        note: 'תמונות סטילס: פריימים לסטוריבורד, דמויות, רקעים, תמונות ממוזערות.',
        input: ['prompt', 'aspect_ratio']
    },
    {
        id: 'music',
        label: 'MiniMax Music',
        kind: 'music',
        slug: 'minimax/music-1.5',
        env: 'STUDIO_MODEL_MUSIC',
        note: 'מוזיקת רקע ושירים לפי תיאור.',
        input: ['prompt', 'lyrics']
    },
    {
        id: 'avatar',
        label: 'OmniHuman',
        kind: 'character',
        slug: 'bytedance/omni-human',
        env: 'STUDIO_MODEL_AVATAR',
        note: 'דמות מדברת מתמונה אחת וקובץ קול: שפתיים, פנים, ראש וידיים זזים לפי הדיבור.',
        input: ['image', 'audio']
    },
    {
        id: 'lipsync',
        label: 'Sync Lipsync',
        kind: 'character',
        slug: 'sync/lipsync-2',
        env: 'STUDIO_MODEL_LIPSYNC',
        note: 'מסנכרן שפתיים של דמות בסרטון קיים לקול חדש, למשל אחרי תרגום.',
        input: ['video', 'audio']
    }
];

// Video models that generate their own soundtrack (speech, effects, ambience).
export const SOUND_MODELS = MODELS.filter((model) => model.sound).map((model) => model.id);

export const DEFAULT_MODEL = { video: 'veo', image: 'flux', music: 'music', avatar: 'avatar', lipsync: 'lipsync' };

export function getModel(id) {
    return MODELS.find((model) => model.id === id) ?? null;
}

export function modelsOfKind(kind) {
    return MODELS.filter((model) => model.kind === kind);
}

// The kinds of job the studio runs, as the page labels them.
export const JOB_KINDS = {
    video: { label: 'וידאו', icon: '🎬' },
    image: { label: 'תמונה', icon: '🖼️' },
    music: { label: 'מוזיקה', icon: '🎵' },
    dub: { label: 'דיבוב', icon: '🗣️' },
    voiceover: { label: 'קריינות', icon: '🎙️' },
    edit: { label: 'עריכה', icon: '✂️' },
    character: { label: 'דמות מדברת', icon: '🧑‍🎤' }
};

// Languages offered for dubbing and voice-over, by ISO 639-1 code (the codes
// ElevenLabs expects). The model can pass any code; these are the ones the page
// names in Hebrew.
export const LANGUAGES = {
    he: 'עברית',
    en: 'אנגלית',
    ar: 'ערבית',
    ru: 'רוסית',
    es: 'ספרדית',
    fr: 'צרפתית',
    de: 'גרמנית',
    it: 'איטלקית',
    pt: 'פורטוגזית',
    nl: 'הולנדית',
    pl: 'פולנית',
    uk: 'אוקראינית',
    tr: 'טורקית',
    hi: 'הינדי',
    zh: 'סינית',
    ja: 'יפנית',
    ko: 'קוריאנית',
    id: 'אינדונזית',
    fil: 'פיליפינית',
    sv: 'שוודית',
    da: 'דנית',
    fi: 'פינית',
    no: 'נורווגית',
    cs: 'צ׳כית',
    el: 'יוונית',
    ro: 'רומנית',
    hu: 'הונגרית',
    bg: 'בולגרית',
    hr: 'קרואטית',
    sk: 'סלובקית',
    ms: 'מלאית',
    ta: 'טמילית',
    vi: 'וייטנאמית'
};

export function languageName(code) {
    return LANGUAGES[code] ?? code;
}
