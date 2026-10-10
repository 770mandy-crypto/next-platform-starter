'use client';

import MarkdownToJsx from 'markdown-to-jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { JOB_KINDS } from 'lib/studio/catalog';

class SignedOutError extends Error {}

const THREAD_KEY = 'studio:thread';
const POLL_MS = 5_000;

const TOOL_LABELS = {
    generate_video: 'מייצר וידאו',
    generate_image: 'מייצר תמונה',
    generate_music: 'מלחין מוזיקה',
    dub_video: 'מדבב',
    create_voiceover: 'מקליט קריינות',
    animate_character: 'מנפיש דמות מדברת',
    edit_video: 'עורך את הסרטון',
    list_jobs: 'בודק את העבודות שלך'
};

const EXAMPLES = [
    'תדבב לי את הסרטון הזה לאנגלית, ספרדית וערבית: https://…',
    'בוא נעשה פרסומת של 20 שניות לבית קפה תל אביבי: תסריט, 4 שוטים, מוזיקה וקריינות בעברית',
    'תכתוב תסריט לסרטון הסבר של דקה על המוצר שלי ותקליט קריינות',
    'צור דמות מצוירת של שועל חמוד שמדבר אל המצלמה ומציג את עצמו בעברית',
    'צור דמות מצוירת של שועל חמוד ותנפיש אותה רצה ביער',
    'תערוך את הקליפים שיצרנו לסרטון אחד עם מוזיקה וכותרות'
];

// Posts one message and reads the reply as it streams: newline-delimited JSON
// events, each handed to onEvent as soon as its line is complete.
async function streamReply({ history, message, signal, onEvent }) {
    const response = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ history, message }),
        signal
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) throw new SignedOutError(data.error);
        throw new Error(data.error || `שגיאה ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let newline;
            while ((newline = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newline).trim();
                buffer = buffer.slice(newline + 1);
                if (line) onEvent(JSON.parse(line));
            }
        }
    } finally {
        reader.cancel().catch(() => {});
    }
}

// Only answered exchanges go back as context; an unanswered question is
// dropped so a rephrasing is not sent alongside it.
function historyOf(thread) {
    const history = [];
    for (const turn of thread) {
        if (turn.role === 'user') history.push({ role: 'user', content: turn.content });
        else if (['done', 'truncated', 'stopped'].includes(turn.state) && turn.content)
            history.push({ role: 'assistant', content: turn.content });
        else if (history.at(-1)?.role === 'user') history.pop();
    }
    return history;
}

function readThread() {
    try {
        const saved = JSON.parse(localStorage.getItem(THREAD_KEY) || '[]');
        return Array.isArray(saved) ? saved.filter((turn) => turn.state !== 'streaming') : [];
    } catch {
        return [];
    }
}

function writeThread(thread) {
    try {
        localStorage.setItem(THREAD_KEY, JSON.stringify(thread.slice(-40)));
    } catch {}
}

// Replies are shown as Markdown without raw HTML or remote images.
const MARKDOWN_OPTIONS = {
    disableParsingRawHTML: true,
    overrides: {
        img: ({ alt }) => (alt ? <span className="text-slate-400">[{alt}]</span> : null),
        a: ({ href, children }) =>
            /^https?:\/\//.test(href ?? '') ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-fuchsia-300 underline"
                >
                    {children}
                </a>
            ) : (
                <span>{children}</span>
            )
    }
};

export default function StudioPage() {
    const [user, setUser] = useState(undefined);
    const [status, setStatus] = useState(null);
    const [thread, setThread] = useState([]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [jobsError, setJobsError] = useState(null);
    const abortRef = useRef(null);
    const endRef = useRef(null);

    useEffect(() => {
        fetch('/api/pilot/auth/me')
            .then((response) => response.json())
            .then((data) => {
                setUser(data.user ?? null);
                if (data.user) setThread(readThread());
            })
            .catch(() => setUser(null));
        fetch('/api/studio/status')
            .then((response) => response.json())
            .then(setStatus)
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (user) writeThread(thread);
    }, [thread, user]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [thread]);

    const loadJobs = useCallback(async () => {
        try {
            const response = await fetch('/api/studio/jobs');
            if (response.status === 401) return setUser(null);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setJobs(data.jobs);
            setJobsError(null);
        } catch (error) {
            setJobsError(error.message || 'לא הצלחתי לטעון את העבודות.');
        }
    }, []);

    useEffect(() => {
        if (user) loadJobs();
    }, [user, loadJobs]);

    // Poll only while something is still running.
    const running = jobs.some((job) => job.status === 'running');
    useEffect(() => {
        if (!user || !running) return undefined;
        const timer = setInterval(loadJobs, POLL_MS);
        return () => clearInterval(timer);
    }, [user, running, loadJobs]);

    const upsertJob = (job) =>
        setJobs((current) =>
            [job, ...current.filter((item) => item.id !== job.id)].sort((a, b) => b.createdAt - a.createdAt)
        );

    const updateLast = (change) =>
        setThread((current) => {
            const last = current.at(-1);
            return [...current.slice(0, -1), { ...last, ...change(last) }];
        });

    async function send(text) {
        const message = text.trim();
        if (!message || busy) return;
        const history = historyOf(thread);
        setDraft('');
        setBusy(true);
        setThread((current) => [
            ...current,
            { role: 'user', content: message },
            { role: 'assistant', content: '', state: 'streaming', activity: [] }
        ]);

        const controller = new AbortController();
        abortRef.current = controller;
        let gap = false;
        try {
            await streamReply({
                history,
                message,
                signal: controller.signal,
                onEvent(event) {
                    if (event.type === 'text') {
                        const piece = gap ? `\n\n${event.text}` : event.text;
                        gap = false;
                        updateLast((last) => ({ content: last.content + piece }));
                    } else if (event.type === 'tool') {
                        gap = true;
                        updateLast((last) => ({
                            activity: [...last.activity, { name: event.name, state: 'running' }]
                        }));
                    } else if (event.type === 'tool_result') {
                        updateLast((last) => {
                            const activity = [...last.activity];
                            const index = activity.findLastIndex(
                                (item) => item.name === event.name && item.state === 'running'
                            );
                            if (index >= 0)
                                activity[index] = {
                                    ...activity[index],
                                    state: event.ok ? 'ok' : 'error',
                                    error: event.error
                                };
                            return { activity };
                        });
                    } else if (event.type === 'job') {
                        upsertJob(event.job);
                    } else if (event.type === 'refused') {
                        updateLast(() => ({ state: 'refused' }));
                    } else if (event.type === 'error') {
                        updateLast(() => ({ state: 'error', error: event.message }));
                    } else if (['done', 'truncated'].includes(event.type)) {
                        updateLast(() => ({ state: event.type }));
                    }
                }
            });
            updateLast((last) => (last.state === 'streaming' ? { state: 'done' } : {}));
        } catch (error) {
            if (error instanceof SignedOutError) setUser(null);
            else if (controller.signal.aborted) updateLast(() => ({ state: 'stopped' }));
            else updateLast(() => ({ state: 'error', error: error.message }));
        } finally {
            abortRef.current = null;
            setBusy(false);
        }
    }

    if (user === undefined) return <div className="grid min-h-[100dvh] place-items-center text-slate-400">טוען…</div>;
    if (user === null) return <SignedOut />;

    return (
        <div className="flex flex-col h-[100dvh]">
            <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/80">
                <a href="/" className="text-sm text-slate-400 hover:text-white">
                    ← לאתר
                </a>
                <h1 className="text-xl font-extrabold bg-gradient-to-l from-fuchsia-400 to-sky-400 bg-clip-text text-transparent">
                    סטודיו AI
                </h1>
                <ProviderChips status={status} />
                <button
                    type="button"
                    onClick={() => !busy && setThread([])}
                    className="ms-auto text-sm text-slate-400 hover:text-white disabled:opacity-40"
                    disabled={busy || !thread.length}
                >
                    שיחה חדשה
                </button>
            </header>

            <div className="grid flex-1 min-h-0 lg:grid-cols-[1fr_380px]">
                <section className="flex flex-col min-h-0">
                    <div className="flex-1 px-4 py-6 overflow-y-auto">
                        <div className="max-w-3xl mx-auto space-y-5">
                            {!thread.length && <Welcome onPick={send} />}
                            {thread.map((turn, index) => (
                                <Turn key={index} turn={turn} />
                            ))}
                            <div ref={endRef} />
                        </div>
                    </div>
                    <form
                        className="px-4 py-3 border-t border-white/10 bg-slate-900/60"
                        onSubmit={(event) => {
                            event.preventDefault();
                            send(draft);
                        }}
                    >
                        <div className="flex items-end max-w-3xl gap-2 mx-auto">
                            <textarea
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault();
                                        send(draft);
                                    }
                                }}
                                rows={2}
                                maxLength={12000}
                                placeholder="ספרו לבמאי מה ליצור, לדבב או לערוך…"
                                className="flex-1 px-4 py-3 text-base text-white border resize-none rounded-2xl bg-slate-800 border-white/10 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                            />
                            {busy ? (
                                <button
                                    type="button"
                                    onClick={() => abortRef.current?.abort()}
                                    className="px-5 py-3 font-bold rounded-2xl bg-slate-700 hover:bg-slate-600"
                                >
                                    עצור
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!draft.trim()}
                                    className="px-5 py-3 font-bold text-white rounded-2xl bg-gradient-to-l from-fuchsia-600 to-sky-600 disabled:opacity-40"
                                >
                                    שלח
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <aside className="min-h-0 overflow-y-auto border-t lg:border-t-0 lg:border-s border-white/10 bg-slate-900/40 max-h-[40dvh] lg:max-h-none">
                    <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur">
                        <h2 className="font-bold">העבודות שלי</h2>
                        {running && <span className="text-xs text-sky-300 animate-pulse">מתעדכן…</span>}
                    </div>
                    <div className="px-4 pb-6 space-y-3">
                        {jobsError && <p className="text-sm text-rose-300">{jobsError}</p>}
                        {!jobs.length && !jobsError && (
                            <p className="text-sm text-slate-500">
                                כאן יופיעו הסרטונים, התמונות, הדיבובים והקריינות שהסטודיו מייצר.
                            </p>
                        )}
                        {jobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}

function ProviderChips({ status }) {
    if (!status) return null;
    return (
        <ul className="flex flex-wrap gap-1.5">
            {status.providers.map((provider) => (
                <li
                    key={provider.id}
                    title={provider.connected ? provider.role : `לא מחובר: צריך להגדיר ${provider.env}`}
                    className={`px-2 py-0.5 text-xs rounded-full ring-1 ${
                        provider.connected
                            ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 ring-white/10'
                    }`}
                >
                    {provider.connected ? '●' : '○'} {provider.label}
                </li>
            ))}
        </ul>
    );
}

function Welcome({ onPick }) {
    return (
        <div className="py-6 text-center">
            <h2 className="text-3xl font-extrabold">מה מפיקים היום?</h2>
            <p className="max-w-xl mx-auto mt-3 text-slate-400">
                הבמאי של הסטודיו מחובר לכלי ה-AI המובילים: וידאו (Veo, Kling, Hailuo), תמונות (FLUX), דמויות שזזות
                ומדברות (OmniHuman, Lipsync), מוזיקה, דיבוב לכל השפות וקריינות (ElevenLabs) ועריכה בענן (Shotstack).
                תארו מה אתם רוצים, והוא יתכנן, יפעיל את הכלים ויחבר הכול.
            </p>
            <div className="grid gap-2 mt-6 text-right sm:grid-cols-2">
                {EXAMPLES.map((example) => (
                    <button
                        key={example}
                        type="button"
                        onClick={() => onPick(example)}
                        className="px-4 py-3 text-sm border rounded-xl border-white/10 bg-slate-900 hover:border-fuchsia-500/60 hover:bg-slate-800"
                    >
                        {example}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Turn({ turn }) {
    if (turn.role === 'user') {
        return (
            <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-3 whitespace-pre-wrap rounded-2xl rounded-ss-sm bg-gradient-to-l from-fuchsia-700/70 to-sky-700/70">
                    {turn.content}
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-2">
            {!!turn.activity?.length && (
                <ul className="flex flex-wrap gap-1.5">
                    {turn.activity.map((item, index) => (
                        <li
                            key={index}
                            title={item.error ?? ''}
                            className={`px-2.5 py-1 text-xs rounded-full ${
                                item.state === 'running'
                                    ? 'bg-sky-500/15 text-sky-300 animate-pulse'
                                    : item.state === 'ok'
                                      ? 'bg-emerald-500/15 text-emerald-300'
                                      : 'bg-rose-500/15 text-rose-300'
                            }`}
                        >
                            {item.state === 'ok' ? '✓' : item.state === 'error' ? '✕' : '…'}{' '}
                            {TOOL_LABELS[item.name] ?? item.name}
                        </li>
                    ))}
                </ul>
            )}
            {turn.state === 'refused' ? (
                <p className="text-amber-300">הבקשה הזו לא אושרה. נסו לנסח אותה אחרת.</p>
            ) : (
                <div className="leading-relaxed pilot-md studio-md">
                    {turn.content ? (
                        <MarkdownToJsx options={MARKDOWN_OPTIONS}>{turn.content}</MarkdownToJsx>
                    ) : (
                        turn.state === 'streaming' && <span className="text-slate-500 animate-pulse">חושב…</span>
                    )}
                </div>
            )}
            {turn.state === 'error' && <p className="text-sm text-rose-300">{turn.error}</p>}
            {turn.state === 'truncated' && <p className="text-xs text-slate-500">התשובה נקטעה. אפשר לכתוב ״המשך״.</p>}
            {turn.state === 'stopped' && <p className="text-xs text-slate-500">נעצר.</p>}
        </div>
    );
}

function JobCard({ job }) {
    const kind = JOB_KINDS[job.kind] ?? { label: job.kind, icon: '•' };
    const isAudio = job.kind === 'voiceover' || job.kind === 'music';
    const isVideo = ['video', 'edit', 'dub', 'character'].includes(job.kind);
    return (
        <article className="overflow-hidden border rounded-xl border-white/10 bg-slate-900">
            {job.status === 'done' && job.url && (
                <div className="bg-black">
                    {job.kind === 'image' && (
                        <img src={job.url} alt={job.title} className="object-contain w-full max-h-56" />
                    )}
                    {isVideo && <video src={job.url} controls preload="metadata" className="w-full max-h-56" />}
                    {isAudio && <audio src={job.url} controls preload="none" className="w-full" />}
                </div>
            )}
            <div className="p-3">
                <div className="flex items-start gap-2">
                    <span aria-hidden>{kind.icon}</span>
                    <h3 className="flex-1 text-sm font-semibold leading-snug">{job.title}</h3>
                    <StatusBadge status={job.status} />
                </div>
                {job.input?.model && <p className="mt-1 text-xs text-slate-500">{job.input.model}</p>}
                {job.status === 'failed' && job.error && <p className="mt-1 text-xs text-rose-300">{job.error}</p>}
                {job.status === 'done' && job.url && (
                    <div className="flex gap-3 mt-2 text-xs">
                        <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-300 hover:underline"
                        >
                            פתיחה
                        </a>
                        <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(job.url)}
                            className="text-slate-400 hover:text-white"
                        >
                            העתקת קישור
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}

function StatusBadge({ status }) {
    const styles = {
        running: ['בעבודה', 'bg-sky-500/15 text-sky-300 animate-pulse'],
        done: ['מוכן', 'bg-emerald-500/15 text-emerald-300'],
        failed: ['נכשל', 'bg-rose-500/15 text-rose-300']
    };
    const [label, style] = styles[status] ?? [status, 'bg-slate-800 text-slate-400'];
    return <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${style}`}>{label}</span>;
}

function SignedOut() {
    return (
        <div className="grid min-h-[100dvh] px-4 place-items-center">
            <div className="w-full max-w-md p-8 text-center border rounded-2xl bg-slate-900 border-white/10">
                <h1 className="text-2xl font-extrabold">סטודיו AI</h1>
                <p className="mt-3 text-slate-400">
                    כדי להשתמש בסטודיו צריך להתחבר (כל עבודה עולה כסף אצל ספקי ה-AI, אז היא נשמרת בחשבון שלך). ההתחברות
                    משותפת לאפליקציית מסלול.
                </p>
                <a
                    href="/pilot"
                    className="inline-block px-5 py-2.5 mt-6 font-bold text-white rounded-xl bg-gradient-to-l from-fuchsia-600 to-sky-600"
                >
                    להתחברות
                </a>
            </div>
        </div>
    );
}
