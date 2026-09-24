// Photo → ready-to-publish listing. The app sends one downscaled JPEG; Claude
// returns a Hebrew title, category, condition and description, plus a
// moderation verdict so prohibited items are caught before they are posted.
//
// Secrets: ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=...).

import Anthropic from 'npm:@anthropic-ai/sdk@0.120.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const CATEGORIES = [
  'furniture',
  'toys',
  'books',
  'home',
  'electronics',
  'baby',
  'clothing',
  'sports',
  'garden',
  'food',
  'other',
] as const;
const CONDITIONS = ['new', 'like_new', 'good', 'fair'] as const;
const MAX_IMAGE_BYTES = 3_500_000;
const DAILY_LIMIT = 40;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'category', 'condition', 'description', 'allowed', 'moderation_reason'],
  properties: {
    title: { type: 'string', description: 'Short Hebrew title, 2–6 words, the way a neighbour would search for it' },
    category: { type: 'string', enum: CATEGORIES },
    condition: { type: 'string', enum: CONDITIONS },
    description: {
      type: 'string',
      description: 'Hebrew, 1–3 short sentences: what it is, visible size/colour/material, visible wear',
    },
    allowed: { type: 'boolean' },
    moderation_reason: { type: 'string', description: 'Empty when allowed; otherwise a short Hebrew reason' },
  },
};

const SYSTEM = `You write listings for GiveBack, an Israeli app where neighbours give away things for free.
Look at the photo and describe the main item being given away.

- Write in natural, everyday Israeli Hebrew. The title is what someone would type into search ("שידה 3 מגירות", "עגלת תינוק", "ספרי ילדים").
- Describe only what is visible. Do not invent brands, measurements or history. If there are several items, describe them as a set.
- Condition: judge from visible wear; when unsure choose "good".
- Set allowed=false for items that may not be given away on the app: weapons or ammunition, medicines or prescription drugs, alcohol, tobacco or vapes, drugs or paraphernalia, live animals, adult content, counterfeit goods, and car seats or helmets that look damaged. Also set allowed=false when the photo shows no item at all, or shows a person as the subject. Give the reason in one short Hebrew sentence.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'המילוי האוטומטי עדיין לא הופעל בשרת', code: 'unconfigured' }, 503);

  // Only signed-in users, and only a bounded number of calls per day each.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: 'יש להתחבר' }, 401);
  if (!allowCall(auth.user.id)) return json({ error: 'הגעת למגבלה היומית של מילוי אוטומטי' }, 429);

  let image: string;
  try {
    const body = await req.json();
    image = String(body?.image ?? '');
  } catch {
    return json({ error: 'בקשה לא תקינה' }, 400);
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length * 0.75 > MAX_IMAGE_BYTES) {
    return json({ error: 'התמונה לא תקינה או גדולה מדי' }, 400);
  }

  const client = new Anthropic({ apiKey });
  try {
    // Opus 5 with low effort: a quick look at one photo, not a hard problem.
    // `fallbacks: "default"` re-runs a request declined by safety classifiers
    // on Anthropic's recommended fallback model instead of failing it.
    const params = {
      model: 'claude-opus-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: 'כתוב/י מודעת מסירה לפריט שבתמונה.' },
          ],
        },
      ],
    };
    // deno-lint-ignore no-explicit-any
    const response = await client.beta.messages.create(params as any);

    if (response.stop_reason === 'refusal') {
      return json({ allowed: false, moderation_reason: 'לא ניתן לפרסם את הפריט הזה' });
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'לא הצלחנו לזהות את הפריט' }, 502);
    return json(JSON.parse(text.text));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'עומס זמני, נסו שוב בעוד רגע' }, 429);
    if (error instanceof Anthropic.BadRequestError) return json({ error: 'לא הצלחנו לקרוא את התמונה' }, 400);
    console.error('ai-listing failed', error);
    return json({ error: 'המילוי האוטומטי לא זמין כרגע' }, 502);
  }
});

// Per-instance daily counter. Instances are recycled, so this is a soft guard
// against a runaway client, not billing-grade accounting.
const calls = new Map<string, { day: string; count: number }>();
function allowCall(userId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const entry = calls.get(userId);
  if (!entry || entry.day !== day) {
    calls.set(userId, { day, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= DAILY_LIMIT;
}
