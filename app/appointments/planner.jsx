'use client';

import { useRef, useState } from 'react';
import { streamResearch } from 'lib/research/client';

const EXAMPLES = [
    ['אורתופד', 'maccabi'],
    ['חידוש דרכון', 'interior'],
    ['בדיקות דם', 'clalit'],
    ['ועדה רפואית לנכות', 'nii']
];

const CHANNEL_ICON = { online: '🌐', app: '📱', phone: '📞', whatsapp: '💬', in_person: '🏢' };
const CHANNEL_LABEL = { online: 'באתר', app: 'באפליקציה', phone: 'בטלפון', whatsapp: 'בוואטסאפ', in_person: 'במקום' };

export function AppointmentPlanner({ providers }) {
    const [need, setNeed] = useState('');
    const [provider, setProvider] = useState('');
    const [city, setCity] = useState('');
    const [when, setWhen] = useState('');
    const [phase, setPhase] = useState('form'); // form | working | done
    const [progress, setProgress] = useState({ sources: [], writing: false });
    const [plan, setPlan] = useState(null);
    const [error, setError] = useState(null);
    const abort = useRef(null);

    async function submit(event) {
        event.preventDefault();
        setError(null);
        setPhase('working');
        setProgress({ sources: [], writing: false });
        abort.current = new AbortController();
        let result = null;
        try {
            await streamResearch(
                '/api/appointments',
                { need, provider, city, when },
                (e) => {
                    if (e.type === 'source') setProgress((p) => ({ ...p, sources: [...p.sources, { url: e.url, title: e.title }].slice(-6) }));
                    else if (e.type === 'writing') setProgress((p) => ({ ...p, writing: true }));
                    else if (e.type === 'plan') result = e.plan;
                    else if (e.type === 'refused') throw new Error('לא ניתן לעזור בבקשה הזאת.');
                    else if (e.type === 'failed') throw new Error('ההכנה נכשלה. נסו שוב.');
                },
                abort.current.signal
            );
            if (!result) throw new Error('החיבור נקטע לפני שההכנה הושלמה. נסו שוב.');
            setPlan(result);
            setPhase('done');
        } catch (err) {
            setPhase('form');
            if (err.name !== 'AbortError') setError(err.message);
        }
    }

    if (phase === 'done' && plan) return <Plan plan={plan} onBack={() => setPhase('form')} />;

    return (
        <main className="mx-auto max-w-2xl px-5 py-10">
            <section className="mb-8 text-center">
                <h1 className="mb-3 text-4xl font-black leading-tight sm:text-5xl">לאיזה תור צריך?</h1>
                <p className="mx-auto max-w-xl text-lg text-slate-600">
                    הסוכן בודק ברשת איך הכי מהר לקבוע את התור, מה להכין ואיך לתפוס תור מוקדם יותר, וכותב הוראה מוכנה ל-Claude in Chrome שיקבע אותו בשבילכם.
                </p>
            </section>

            {phase === 'working' ? (
                <div className="rounded-3xl border border-sky-100 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-5 size-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
                    <p className="mb-1 text-xl font-bold">{progress.writing ? 'מכין את התוכנית…' : 'בודק איך קובעים את התור…'}</p>
                    <p className="mb-5 text-sm text-slate-500">בדרך כלל פחות מדקה.</p>
                    {progress.sources.length > 0 && (
                        <ul className="mx-auto mb-5 max-w-md space-y-1 text-right text-sm text-slate-600">
                            {progress.sources.map((s) => (
                                <li key={s.url} className="truncate">
                                    📄 {s.title}
                                </li>
                            ))}
                        </ul>
                    )}
                    <button type="button" onClick={() => abort.current?.abort()} className="text-sm text-slate-500 underline">
                        ביטול
                    </button>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-6 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm sm:p-8">
                    <label className="block">
                        <span className="mb-1 block font-bold">מה צריך?</span>
                        <input
                            value={need}
                            onChange={(e) => setNeed(e.target.value)}
                            required
                            minLength={2}
                            placeholder="למשל: אורתופד, רופא עור לילד, חידוש דרכון"
                            className="w-full rounded-xl border border-slate-300 p-3 text-lg"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            {EXAMPLES.map(([text, prov]) => (
                                <button
                                    key={text}
                                    type="button"
                                    onClick={() => {
                                        setNeed(text);
                                        setProvider(prov);
                                    }}
                                    className="rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-800 hover:bg-sky-100"
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                    </label>

                    <fieldset>
                        <legend className="mb-2 font-bold">איפה?</legend>
                        <div className="flex flex-wrap gap-2">
                            {providers.map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setProvider(provider === id ? '' : id)}
                                    className={`rounded-full border px-3 py-1.5 text-sm ${
                                        provider === id ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white hover:border-sky-400'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block font-bold">
                                עיר או אזור <span className="font-normal text-slate-500">(לא חובה)</span>
                            </span>
                            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="למשל: רמת גן" className="w-full rounded-xl border border-slate-300 p-3" />
                        </label>
                        <label className="block">
                            <span className="mb-1 block font-bold">
                                מתי נוח? <span className="font-normal text-slate-500">(לא חובה)</span>
                            </span>
                            <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="למשל: בבקרים, לא בימי שלישי" className="w-full rounded-xl border border-slate-300 p-3" />
                        </label>
                    </div>

                    {error && <p className="rounded-xl bg-rose-50 p-3 font-bold text-rose-800">{error}</p>}

                    <button type="submit" className="w-full rounded-2xl bg-sky-600 py-4 text-lg font-black text-white hover:bg-sky-700">
                        להכין לי את התור
                    </button>
                    <p className="text-center text-xs text-slate-500">
                        לא צריך סיסמאות או תעודת זהות. הסוכן לא נכנס לחשבונות שלכם, ואת הקביעה עצמה עושים אתם או Claude in Chrome בדפדפן שלכם.
                    </p>
                </form>
            )}
        </main>
    );
}

function Plan({ plan, onBack }) {
    const [copied, setCopied] = useState(false);
    const [done, setDone] = useState({});

    async function copyTask() {
        try {
            await navigator.clipboard.writeText(plan.chromeTask);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {}
    }

    return (
        <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
            <div className="flex flex-wrap items-start gap-3">
                <h1 className="flex-1 text-3xl font-black">{plan.title}</h1>
                <button type="button" onClick={onBack} className="rounded-xl px-3 py-2 text-slate-600 underline">
                    תור אחר
                </button>
            </div>
            {plan.summary && <p className="text-lg leading-relaxed text-slate-700">{plan.summary}</p>}

            <section>
                <h2 className="mb-3 text-xl font-black">איפה קובעים</h2>
                <div className="space-y-3">
                    {plan.channels.map((c, i) => (
                        <div key={i} className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${i === 0 ? 'ring-2 ring-sky-500' : 'ring-slate-200'}`}>
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="text-2xl">{CHANNEL_ICON[c.kind]}</span>
                                <span className="font-bold">{c.name}</span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{CHANNEL_LABEL[c.kind]}</span>
                                {i === 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">הכי מומלץ</span>}
                            </div>
                            {c.hours && <p className="text-sm text-slate-600">🕘 {c.hours}</p>}
                            {c.note && <p className="text-sm text-slate-600">{c.note}</p>}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {c.url && (
                                    <a href={c.url} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white no-underline">
                                        לקביעת תור
                                    </a>
                                )}
                                {c.phone && (
                                    <a href={`tel:${c.phone.replace(/[^\d*#+]/g, '')}`} dir="ltr" className="rounded-xl bg-white px-4 py-2 text-sm font-bold no-underline ring-1 ring-slate-300">
                                        📞 {c.phone}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {plan.prepare.length > 0 && (
                <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
                    <h2 className="mb-2 text-xl font-black">✅ מה להכין</h2>
                    <ul className="space-y-2">
                        {plan.prepare.map((item, i) => (
                            <li key={i}>
                                <label className="flex cursor-pointer items-start gap-2">
                                    <input type="checkbox" checked={Boolean(done[i])} onChange={() => setDone({ ...done, [i]: !done[i] })} className="mt-1.5 size-4" />
                                    <span className={done[i] ? 'text-slate-400 line-through' : ''}>{item}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                    {plan.cost && <p className="mt-3 text-sm">💰 {plan.cost}</p>}
                </section>
            )}

            {plan.steps.length > 0 && (
                <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                    <h2 className="mb-2 text-xl font-black">צעד אחר צעד</h2>
                    <ol className="list-decimal space-y-1 pr-5">
                        {plan.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ol>
                </section>
            )}

            {plan.tips.length > 0 && (
                <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                    <h2 className="mb-2 text-xl font-black">💡 לתור מוקדם יותר</h2>
                    <ul className="list-disc space-y-1 pr-5">
                        {plan.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="rounded-2xl bg-slate-900 p-5 text-white">
                <h2 className="mb-1 text-xl font-black">🤖 ש-Claude יקבע את התור בשבילך</h2>
                <p className="mb-3 text-sm text-slate-300">
                    עם התוסף Claude in Chrome, Claude עובד בדפדפן שלך: אתה מתחבר לאתר בעצמך, והוא מחפש תור ומבקש ממך אישור לפני שהוא קובע.
                </p>
                <ol className="mb-4 list-decimal space-y-1 pr-5 text-sm text-slate-200">
                    <li>
                        מתקינים את{' '}
                        <a href="https://chromewebstore.google.com/search/Claude" target="_blank" rel="noreferrer" className="text-sky-300 underline">
                            Claude in Chrome
                        </a>{' '}
                        מחנות התוספים של Chrome (פעם אחת).
                    </li>
                    <li>פותחים את אתר הקביעה ומתחברים בעצמכם.</li>
                    <li>מעתיקים את ההוראה ומדביקים אותה בחלון של Claude in Chrome.</li>
                </ol>
                <pre className="mb-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-800 p-4 font-hebrew text-sm leading-relaxed">{plan.chromeTask}</pre>
                <button type="button" onClick={copyTask} className="w-full rounded-xl bg-sky-500 py-3 font-black text-white hover:bg-sky-400">
                    {copied ? 'הועתק ✓ עכשיו להדביק ב-Claude in Chrome' : 'העתקת ההוראה'}
                </button>
            </section>

            {plan.sources.length > 0 && (
                <section className="text-sm">
                    <h2 className="mb-1 font-bold">מקורות</h2>
                    <ul className="space-y-1">
                        {plan.sources.map((s) => (
                            <li key={s.url}>
                                <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-700 underline">
                                    {s.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            <p className="text-xs text-slate-500">המידע נאסף ברשת על ידי בינה מלאכותית. כדאי לוודא באתר הרשמי לפני שיוצאים לדרך.</p>
        </main>
    );
}
