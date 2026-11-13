'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 3_000;
const LIVE = ['creating', 'joining', 'waiting_room', 'in_call', 'live'];
const IN_CALL = ['in_call', 'live'];

const STATUS = {
    creating: ['יוצר בוט', 'bg-sky-500/15 text-sky-300 animate-pulse'],
    joining: ['מצטרף לפגישה', 'bg-sky-500/15 text-sky-300 animate-pulse'],
    waiting_room: ['ממתין שיאשרו את הכניסה', 'bg-amber-500/15 text-amber-300 animate-pulse'],
    in_call: ['בפגישה', 'bg-emerald-500/15 text-emerald-300'],
    live: ['בפגישה, מקשיב', 'bg-emerald-500/15 text-emerald-300'],
    ended: ['הפגישה הסתיימה', 'bg-slate-700 text-slate-300'],
    failed: ['נכשל', 'bg-rose-500/15 text-rose-300']
};

const LANGUAGES = [
    ['he', 'עברית'],
    ['en', 'English'],
    ['ar', 'العربية'],
    ['ru', 'Русский'],
    ['fr', 'Français'],
    ['es', 'Español']
];

async function api(path, options) {
    const response = await fetch(path, {
        ...options,
        headers: options?.body ? { 'content-type': 'application/json' } : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || `שגיאה ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return data;
}

export default function MeetPage() {
    const [user, setUser] = useState(undefined);
    const [status, setStatus] = useState(null);
    const [meetings, setMeetings] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const loadMeetings = useCallback(async () => {
        try {
            const data = await api('/api/meet/meetings');
            setMeetings(data.meetings);
            return data.meetings;
        } catch (error) {
            if (error.status === 401) setUser(null);
            return [];
        }
    }, []);

    useEffect(() => {
        fetch('/api/pilot/auth/me')
            .then((response) => response.json())
            .then(async (data) => {
                setUser(data.user ?? null);
                if (!data.user) return;
                const list = await loadMeetings();
                const live = list.find((meeting) => LIVE.includes(meeting.status));
                if (live) setActiveId(live.id);
            })
            .catch(() => setUser(null));
        fetch('/api/meet/status')
            .then((response) => response.json())
            .then(setStatus)
            .catch(() => {});
    }, [loadMeetings]);

    if (user === undefined) return <div className="grid min-h-[100dvh] place-items-center text-slate-500">טוען…</div>;
    if (user === null) return <SignedOut />;

    return (
        <div className="max-w-5xl px-4 py-6 mx-auto">
            <header className="flex flex-wrap items-center gap-3 pb-5 border-b border-white/10">
                <a href="/" className="text-sm text-slate-400 hover:text-white">
                    ← לאתר
                </a>
                <h1 className="text-2xl font-extrabold text-transparent bg-gradient-to-l from-emerald-400 to-sky-400 bg-clip-text">
                    בוט פגישות
                </h1>
                <ServiceChips status={status} />
            </header>

            <Setup status={status} />

            <div className="grid gap-6 mt-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-6">
                    <NewMeeting
                        disabled={status && !status.recall}
                        userName={user.name}
                        onCreated={async (meeting) => {
                            await loadMeetings();
                            setActiveId(meeting.id);
                        }}
                    />
                    <MeetingList meetings={meetings} activeId={activeId} onPick={setActiveId} />
                </div>
                {activeId ? (
                    <Meeting key={activeId} id={activeId} onChanged={loadMeetings} />
                ) : (
                    <div className="grid p-10 text-center border border-dashed rounded-2xl border-white/10 text-slate-500 place-items-center">
                        שלחו את הבוט לפגישה, והתמלול, התשובות והסיכום יופיעו כאן.
                    </div>
                )}
            </div>
        </div>
    );
}

function ServiceChips({ status }) {
    if (!status) return null;
    const chips = [
        ['הצטרפות לפגישות', status.recall],
        ['חשיבה (Claude)', status.brain],
        ['דיבור בקול', status.speech],
        ['שליחת מייל', status.mail]
    ];
    return (
        <div className="flex flex-wrap gap-2 ms-auto">
            {chips.map(([label, on]) => (
                <span
                    key={label}
                    className={`px-2.5 py-1 text-xs rounded-full ${on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}
                >
                    {on ? '●' : '○'} {label}
                </span>
            ))}
        </div>
    );
}

// Says exactly what is missing, in order of how much it blocks.
function Setup({ status }) {
    if (!status) return null;
    const missing = [];
    if (!status.recall)
        missing.push(['RECALL_API_KEY', 'בלי המפתח הזה הבוט לא יכול להצטרף לפגישות. נרשמים ב-recall.ai ויוצרים מפתח.']);
    if (!status.brain) missing.push(['ANTHROPIC_API_KEY', 'בלי המפתח הזה הבוט מתמלל אבל לא עונה, לא מסכם ולא מכין מצגות.']);
    if (!status.speech)
        missing.push(['ELEVENLABS_API_KEY', 'בלי המפתח הזה הבוט עונה בכתב בצ׳אט של הפגישה במקום בקול.']);
    if (!status.mail)
        missing.push(['RESEND_API_KEY + EMAIL_FROM', 'בלי שני אלה הבוט לא שולח חומרים במייל, רק קישור בצ׳אט של הפגישה.']);
    if (!status.reachable)
        missing.push(['MEET_PUBLIC_URL', 'האתר רץ בכתובת מקומית, ו-Recall לא יכול לשלוח אליה את התמלול. צריך כתובת https ציבורית.']);
    if (!missing.length) return null;
    return (
        <div className="p-4 mt-5 text-sm border rounded-2xl border-amber-500/30 bg-amber-500/5">
            <p className="font-bold text-amber-300">חסרות הגדרות באתר</p>
            <ul className="mt-2 space-y-1.5 text-slate-300">
                {missing.map(([name, why]) => (
                    <li key={name}>
                        <code dir="ltr" className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-200">
                            {name}
                        </code>{' '}
                        {why}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function NewMeeting({ disabled, userName, onCreated }) {
    const [meetingUrl, setMeetingUrl] = useState('');
    const [botName, setBotName] = useState('קלוד');
    const [language, setLanguage] = useState('he');
    const [ownerName, setOwnerName] = useState(userName || '');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const data = await api('/api/meet/meetings', {
                method: 'POST',
                body: JSON.stringify({ meetingUrl, botName, language, ownerName, recipientName, recipientEmail })
            });
            setMeetingUrl('');
            await onCreated(data.meeting);
        } catch (caught) {
            setError(caught.message);
        } finally {
            setBusy(false);
        }
    };

    const field = 'w-full px-3 py-2.5 text-white border rounded-xl bg-slate-800 border-white/10 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500';
    return (
        <form onSubmit={submit} className="p-5 space-y-3 border rounded-2xl bg-slate-900 border-white/10">
            <h2 className="text-lg font-bold">שליחת הבוט לפגישה</h2>
            <label className="block text-sm text-slate-400">
                קישור לפגישה (Meet, Zoom או Teams)
                <input
                    dir="ltr"
                    type="url"
                    required
                    value={meetingUrl}
                    onChange={(event) => setMeetingUrl(event.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className={`${field} mt-1`}
                />
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-slate-400">
                    שם הבוט
                    <input
                        value={botName}
                        maxLength={40}
                        onChange={(event) => setBotName(event.target.value)}
                        className={`${field} mt-1`}
                    />
                </label>
                <label className="block text-sm text-slate-400">
                    שפת הפגישה
                    <select value={language} onChange={(event) => setLanguage(event.target.value)} className={`${field} mt-1`}>
                        {LANGUAGES.map(([code, label]) => (
                            <option key={code} value={code}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <label className="block text-sm text-slate-400">
                השם שלי בפגישה
                <input
                    value={ownerName}
                    maxLength={60}
                    onChange={(event) => setOwnerName(event.target.value)}
                    className={`${field} mt-1`}
                />
            </label>
            <p className="text-xs leading-relaxed text-slate-500">
                כשמישהו פונה אליך בשם ומבקש דף עבודה או מצגת, הבוט מכין אותם בשמך. על שאלות אליך הוא לא עונה.
            </p>
            <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm text-slate-400">
                    לשלוח חומרים אל
                    <input
                        value={recipientName}
                        maxLength={60}
                        placeholder="הרב"
                        onChange={(event) => setRecipientName(event.target.value)}
                        className={`${field} mt-1`}
                    />
                </label>
                <label className="block text-sm text-slate-400">
                    מייל
                    <input
                        dir="ltr"
                        type="email"
                        value={recipientEmail}
                        placeholder="name@example.com"
                        onChange={(event) => setRecipientEmail(event.target.value)}
                        className={`${field} mt-1`}
                    />
                </label>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
                הבוט נכנס כמשתתף גלוי, מציג את עצמו ומודיע שהוא מתמלל. כדי לפנות אליו אומרים או כותבים את שמו.
            </p>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
                type="submit"
                disabled={busy || disabled || !meetingUrl.trim()}
                className="w-full px-5 py-2.5 font-bold text-white rounded-xl bg-gradient-to-l from-emerald-600 to-sky-600 disabled:opacity-40"
            >
                {busy ? 'שולח…' : 'שלח את הבוט'}
            </button>
        </form>
    );
}

function StatusBadge({ status }) {
    const [label, style] = STATUS[status] ?? [status, 'bg-slate-800 text-slate-400'];
    return <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full ${style}`}>{label}</span>;
}

function MeetingList({ meetings, activeId, onPick }) {
    if (!meetings.length) return null;
    return (
        <div>
            <h2 className="mb-2 text-sm font-bold text-slate-400">הפגישות שלי</h2>
            <ul className="space-y-2">
                {meetings.map((meeting) => (
                    <li key={meeting.id}>
                        <button
                            type="button"
                            onClick={() => onPick(meeting.id)}
                            className={`w-full p-3 text-start border rounded-xl ${meeting.id === activeId ? 'border-emerald-500/50 bg-slate-900' : 'border-white/10 bg-slate-900/40 hover:bg-slate-900'}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold truncate">{meeting.summary?.title || 'פגישה'}</span>
                                <StatusBadge status={meeting.status} />
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                {new Date(meeting.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Meeting({ id, onChanged }) {
    const [meeting, setMeeting] = useState(null);
    const [lines, setLines] = useState([]);
    const [decks, setDecks] = useState([]);
    const [docs, setDocs] = useState([]);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(null);
    const [draft, setDraft] = useState('');
    const [topic, setTopic] = useState('');
    const cursor = useRef(null);
    const lastStatus = useRef(null);
    const endRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const query = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : '';
            const data = await api(`/api/meet/meetings/${id}${query}`);
            setMeeting(data.meeting);
            setDecks(data.decks);
            setDocs(data.docs ?? []);
            if (data.lines.length) {
                // Two loads can overlap (the poll and an action finishing), so
                // both may return the same new lines: add each line once.
                const newest = data.lines.at(-1).key;
                if (!cursor.current || newest > cursor.current) cursor.current = newest;
                setLines((current) => {
                    const have = new Set(current.map((line) => line.key));
                    return [...current, ...data.lines.filter((line) => !have.has(line.key))];
                });
            }
            if (lastStatus.current !== data.meeting.status) {
                lastStatus.current = data.meeting.status;
                onChanged();
            }
            return data.meeting;
        } catch (caught) {
            setError(caught.message);
            return null;
        }
    }, [id, onChanged]);

    // Poll while the bot is on its way or in the meeting; stop when it ends.
    useEffect(() => {
        let stopped = false;
        let timer;
        const tick = async () => {
            const current = await load();
            if (!stopped && (!current || LIVE.includes(current.status))) timer = setTimeout(tick, POLL_MS);
        };
        tick();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [load]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'nearest' });
    }, [lines.length]);

    const act = async (type, body = {}) => {
        setBusy(type);
        setError(null);
        try {
            await api(`/api/meet/meetings/${id}/action`, { method: 'POST', body: JSON.stringify({ type, ...body }) });
            await load();
            return true;
        } catch (caught) {
            setError(caught.message);
            return false;
        } finally {
            setBusy(null);
        }
    };

    if (!meeting) return <div className="p-10 text-center text-slate-500">{error || 'טוען…'}</div>;
    const inCall = IN_CALL.includes(meeting.status);
    const button = 'px-4 py-2 text-sm font-bold rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40';

    return (
        <section className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={meeting.status} />
                <span dir="ltr" className="text-sm truncate text-slate-400">
                    {meeting.meetingUrl}
                </span>
                {LIVE.includes(meeting.status) && meeting.status !== 'creating' && (
                    <button type="button" onClick={() => act('leave')} disabled={busy !== null} className={`${button} ms-auto text-rose-300`}>
                        {busy === 'leave' ? 'מוציא…' : 'הוצא את הבוט'}
                    </button>
                )}
            </div>
            {meeting.status === 'waiting_room' && (
                <p className="p-3 text-sm border rounded-xl border-amber-500/30 bg-amber-500/5 text-amber-200">
                    הבוט מחכה בכניסה לפגישה. צריך לאשר לו להיכנס מתוך הפגישה עצמה.
                </p>
            )}
            {meeting.status === 'failed' && meeting.statusDetail && (
                <p className="p-3 text-sm border rounded-xl border-rose-500/30 bg-rose-500/5 text-rose-200">{meeting.statusDetail}</p>
            )}
            {error && <p className="text-sm text-rose-300">{error}</p>}

            <div className="border rounded-2xl bg-slate-900 border-white/10">
                <h2 className="px-4 py-3 text-lg font-bold border-b border-white/10">תמלול חי</h2>
                <div className="px-4 py-3 space-y-2.5 overflow-y-auto max-h-[45dvh]">
                    {!lines.length && <p className="py-6 text-center text-slate-500">עדיין לא נאמר דבר.</p>}
                    {lines.map((line) => (
                        <p key={line.key} className={`text-sm leading-relaxed ${line.kind === 'bot' ? 'text-emerald-300' : ''}`}>
                            <span className="font-bold">{line.speaker || 'משתתף'}</span>
                            {line.kind === 'chat' && <span className="text-slate-500"> (בצ׳אט)</span>}
                            <span className="text-slate-500">: </span>
                            <span className="whitespace-pre-wrap">{line.text}</span>
                        </p>
                    ))}
                    <div ref={endRef} />
                </div>
                {inCall && (
                    <form
                        className="flex flex-wrap gap-2 p-3 border-t border-white/10"
                        onSubmit={async (event) => {
                            event.preventDefault();
                            if (await act(event.nativeEvent.submitter?.value || 'ask', { text: draft })) setDraft('');
                        }}
                    >
                        <input
                            value={draft}
                            maxLength={2000}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder="שאלו את הבוט, או כתבו משהו שיאמר בפגישה…"
                            className="flex-1 basis-full sm:basis-0 min-w-0 px-3 py-2 text-white border rounded-xl bg-slate-800 border-white/10 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button type="submit" value="ask" disabled={!draft.trim() || busy !== null} className={button}>
                            {busy === 'ask' ? 'עונה…' : 'שאל'}
                        </button>
                        <button type="submit" value="say" disabled={!draft.trim() || busy !== null} className={button}>
                            {busy === 'say' ? 'אומר…' : 'אמור בפגישה'}
                        </button>
                    </form>
                )}
            </div>

            <div className="p-4 border rounded-2xl bg-slate-900 border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">סיכום</h2>
                    <button type="button" onClick={() => act('summary')} disabled={busy !== null} className={`${button} ms-auto`}>
                        {busy === 'summary' ? 'מסכם…' : meeting.summary ? 'סכם מחדש' : 'סכם עכשיו'}
                    </button>
                    {inCall && (
                        <button type="button" onClick={() => act('summary', { announce: true })} disabled={busy !== null} className={button}>
                            סכם ושתף בפגישה
                        </button>
                    )}
                </div>
                {meeting.summary ? (
                    <Summary summary={meeting.summary} />
                ) : (
                    <p className="mt-3 text-sm text-slate-500">הסיכום נכתב אוטומטית כשהפגישה מסתיימת, ואפשר לבקש אותו בכל רגע.</p>
                )}
            </div>

            <div className="p-4 border rounded-2xl bg-slate-900 border-white/10">
                <h2 className="text-lg font-bold">דפי עבודה ומצגות</h2>
                {meeting.recipientEmail && (
                    <p className="mt-1 text-sm text-slate-400">
                        חומר שמשותף בפגישה נשלח גם במייל אל {meeting.recipientName || 'הנמען'} (<span dir="ltr">{meeting.recipientEmail}</span>).
                    </p>
                )}
                <form
                    className="flex flex-wrap gap-2 mt-3"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        const [type, mode] = (event.nativeEvent.submitter?.value || 'worksheet:quiet').split(':');
                        if (await act(type, { text: topic, announce: mode === 'announce' })) setTopic('');
                    }}
                >
                    <input
                        value={topic}
                        maxLength={500}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="נושא (ריק: הפגישה עצמה)"
                        className="flex-1 basis-full min-w-0 px-3 py-2 text-white border rounded-xl bg-slate-800 border-white/10 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button type="submit" value="worksheet:quiet" disabled={busy !== null} className={button}>
                        {busy === 'worksheet' ? 'כותב…' : 'צור דף עבודה'}
                    </button>
                    <button type="submit" value="deck:quiet" disabled={busy !== null} className={button}>
                        {busy === 'deck' ? 'בונה…' : 'צור מצגת'}
                    </button>
                    {inCall && (
                        <>
                            <button type="submit" value="worksheet:announce" disabled={busy !== null} className={button}>
                                דף עבודה + שיתוף
                            </button>
                            <button type="submit" value="deck:announce" disabled={busy !== null} className={button}>
                                מצגת + שיתוף
                            </button>
                        </>
                    )}
                </form>
                {(docs.length > 0 || decks.length > 0) && (
                    <ul className="mt-3 space-y-1.5">
                        {docs.map((doc) => (
                            <li key={doc.id}>
                                <a href={`/meet/doc/${doc.id}`} target="_blank" rel="noreferrer" className="text-sm text-sky-300 hover:underline">
                                    {doc.title} (דף עבודה)
                                </a>
                            </li>
                        ))}
                        {decks.map((deck) => (
                            <li key={deck.id}>
                                <a href={`/meet/deck/${deck.id}`} target="_blank" rel="noreferrer" className="text-sm text-sky-300 hover:underline">
                                    {deck.title} ({deck.slides} שקפים)
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

function Summary({ summary }) {
    const list = (title, items) =>
        items?.length > 0 && (
            <div>
                <h3 className="mt-4 text-sm font-bold text-slate-300">{title}</h3>
                <ul className="mt-1.5 space-y-1 text-sm list-disc ps-5 text-slate-300">
                    {items.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </div>
        );
    return (
        <div className="mt-3">
            <h3 className="text-lg font-bold">{summary.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{summary.overview}</p>
            {list('עיקרי הדברים', summary.keyPoints)}
            {list('החלטות', summary.decisions)}
            {list(
                'משימות',
                summary.actionItems?.map((item) => (item.owner ? `${item.owner}: ${item.task}` : item.task))
            )}
            {list('שאלות פתוחות', summary.openQuestions)}
            <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(summary.text)}
                className="px-3 py-1.5 mt-4 text-xs rounded-lg bg-slate-800 hover:bg-slate-700"
            >
                העתק סיכום
            </button>
        </div>
    );
}

function SignedOut() {
    return (
        <div className="grid min-h-[100dvh] px-4 place-items-center">
            <div className="w-full max-w-md p-8 text-center border rounded-2xl bg-slate-900 border-white/10">
                <h1 className="text-2xl font-extrabold">בוט פגישות</h1>
                <p className="mt-3 text-slate-400">
                    כדי לשלוח בוט לפגישה צריך להתחבר (כל פגישה עולה כסף אצל ספקי השירות, אז היא נשמרת בחשבון שלך).
                    ההתחברות משותפת לאפליקציית מסלול.
                </p>
                <a
                    href="/pilot"
                    className="inline-block px-5 py-2.5 mt-6 font-bold text-white rounded-xl bg-gradient-to-l from-emerald-600 to-sky-600"
                >
                    להתחברות
                </a>
            </div>
        </div>
    );
}
