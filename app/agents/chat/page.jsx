'use client';

import MarkdownToJsx from 'markdown-to-jsx';
import { useEffect, useRef, useState } from 'react';
import { AGENTS, getAgent } from 'lib/agents/catalog';
import { cleanThread, mergeThreads } from 'lib/agents/saved-chats';

class SignedOutError extends Error {}

// Posts one message and reads the reply as it streams: newline-delimited JSON
// events, each handed to onEvent as soon as its line is complete.
async function streamReply({ agent, history, message, signal, onEvent }) {
    const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agent, history, message }),
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
                if (line) onEvent(parseEvent(line));
            }
        }
    } finally {
        // However the loop ends, close the connection so the server stops
        // generating a reply nobody is reading.
        reader.cancel().catch(() => {});
    }
}

function parseEvent(line) {
    try {
        return JSON.parse(line);
    } catch {
        throw new Error('התקבלה מהשרת תשובה לא תקינה. נסו שוב.');
    }
}

// Only answered exchanges go back to the server as context. A reply that was
// refused, failed or stopped before any text is dropped together with the
// question it did not answer, so a rephrased question is not sent alongside it.
function historyOf(thread) {
    const history = [];
    for (const turn of thread) {
        if (turn.role === 'user') {
            history.push({ role: 'user', content: turn.content });
        } else if (['done', 'truncated', 'stopped'].includes(turn.state) && turn.content) {
            history.push({ role: 'assistant', content: turn.content });
        } else if (history.at(-1)?.role === 'user') {
            history.pop();
        }
    }
    return history;
}

// Replies can echo whatever was pasted into the chat, including text written
// to steer the model. So raw HTML in a reply is shown as text, never rendered
// (no forms, styles or frames), and images are not loaded: a remote image URL
// could carry conversation text to another server. The alt text is shown.
const MARKDOWN_OPTIONS = {
    disableParsingRawHTML: true,
    overrides: {
        img: ({ alt }) => (alt ? <span className="text-slate-500">[{alt}]</span> : null),
        a: ReplyLink
    }
};

// Links in replies open in a new tab and show where they go, so a link whose
// text hides its real address (say, one a web page steered the agent into
// writing) is visible for what it is. Only http(s) links are clickable.
function ReplyLink({ href, title, children }) {
    let host = null;
    try {
        const url = new URL(href);
        if (url.protocol === 'https:' || url.protocol === 'http:') host = url.hostname.replace(/^www\./, '');
    } catch {}
    if (!host) return <span>{children}</span>;
    const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
    return (
        <>
            <a href={href} title={title} target="_blank" rel="noopener noreferrer nofollow">
                {children}
            </a>
            {!text.includes(host) && (
                <span dir="ltr" className="text-xs text-slate-400">
                    {' '}
                    ({host})
                </span>
            )}
        </>
    );
}

const NO_TURNS = [];
const AGENT_ID_LIST = AGENTS.map((item) => item.id);

function newWriterId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
const ACTIVITY = { searching: 'מחפש ברשת…', reading: 'קורא את הדף…' };
const SELECTED_AGENT_KEY = 'agents-chat:selected-agent';

async function fetchSavedChats() {
    try {
        const response = await fetch('/api/agents/chats');
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.threads || typeof data.threads !== 'object') return null;
        return { threads: data.threads, versions: data.versions && typeof data.versions === 'object' ? data.versions : {} };
    } catch {
        return null;
    }
}

// How often an open chat checks for changes made on another device.
const LIVE_CHECK_MS = 8000;

async function fetchVersions() {
    try {
        const response = await fetch('/api/agents/chats?versions=1');
        if (!response.ok) return null;
        const data = await response.json();
        return data.versions && typeof data.versions === 'object' ? data.versions : null;
    } catch {
        return null;
    }
}

function sameVersions(a, b) {
    return AGENT_ID_LIST.every((id) => (a[id] ?? 0) === (b[id] ?? 0));
}

// Which agent was open is a per-device preference, kept in this browser.
function readSelectedAgent() {
    try {
        const id = window.localStorage.getItem(SELECTED_AGENT_KEY);
        return getAgent(id) ? id : null;
    } catch {
        return null;
    }
}

function writeSelectedAgent(id) {
    try {
        window.localStorage.setItem(SELECTED_AGENT_KEY, id);
    } catch {}
}

let counter = 0;
const newId = () => `m${Date.now().toString(36)}${(counter += 1)}`;

export default function AgentChatPage() {
    const [user, setUser] = useState(undefined); // undefined while checking
    const [agentId, setAgentId] = useState(AGENTS[0].id);
    const [threads, setThreads] = useState({});
    const [drafts, setDrafts] = useState({});
    const [busy, setBusy] = useState(null); // id of the agent currently answering
    const [restoredFor, setRestoredFor] = useState(null); // user whose saved chats are loaded
    const [syncProblem, setSyncProblem] = useState(null); // 'load' | 'save' | null
    const controllerRef = useRef(null);
    const listRef = useRef(null);
    const threadsRef = useRef(threads); // latest chats, for timers and page exit
    const confirmedRef = useRef({}); // each agent's chat as the server last confirmed it
    const versionsRef = useRef({}); // the server's version of each agent's chat, which saves build on
    const inFlightRef = useRef({}); // agent -> the version a save request is carrying now
    const saveCountRef = useRef(0); // saves started so far, to spot one that raced a reload
    const writerRef = useRef(null); // this page's identity, so the server can order its saves
    const busyRef = useRef(null);
    const saveTimerRef = useRef(null);
    const savingRef = useRef(Promise.resolve());

    const agent = getAgent(agentId);
    const thread = threads[agentId] ?? [];
    const draft = drafts[agentId] ?? '';

    useEffect(() => {
        fetch('/api/pilot/auth/me')
            .then((response) => response.json())
            .then(async (data) => {
                const signedIn = data.user ?? null;
                if (signedIn) {
                    const selected = readSelectedAgent();
                    if (selected) setAgentId(selected);
                    const saved = await fetchSavedChats();
                    if (saved) {
                        confirmedRef.current = saved.threads;
                        versionsRef.current = saved.versions;
                        setThreads(saved.threads);
                        setRestoredFor(signedIn.id);
                    } else {
                        // Without the saved chats, saving now could overwrite
                        // them; loading is retried below until it works.
                        setSyncProblem('load');
                    }
                }
                setUser(signedIn);
            })
            .catch(() => setUser(null));
    }, []);

    // If the saved chats could not be loaded, keep trying. Once they arrive,
    // anything written here meanwhile is added to them and then saved.
    useEffect(() => {
        if (!user || restoredFor === user.id || syncProblem !== 'load') return;
        let cancelled = false;
        const retry = setInterval(async () => {
            const saved = await fetchSavedChats();
            if (!saved || cancelled) return;
            clearInterval(retry);
            confirmedRef.current = saved.threads;
            versionsRef.current = saved.versions;
            setThreads((local) => {
                const combined = { ...saved.threads };
                for (const id of AGENT_ID_LIST) {
                    if (local[id]?.length) combined[id] = mergeThreads(saved.threads[id] ?? NO_TURNS, local[id], []);
                }
                return combined;
            });
            setSyncProblem(null);
            setRestoredFor(user.id);
        }, LIVE_CHECK_MS);
        return () => {
            cancelled = true;
            clearInterval(retry);
        };
    }, [user, restoredFor, syncProblem]);

    // The open agent is remembered per device, but only once the remembered
    // choice has been read: writing the default first would overwrite it.
    useEffect(() => {
        if (user) writeSelectedAgent(agentId);
    }, [agentId, user]);

    // Chats are saved to the account so they follow the user to any device.
    // A chat counts as saved only once the server confirms it. Changed chats go
    // out every 1.5s (4s while a reply streams), one request at a time.
    function unconfirmedAgents() {
        return AGENT_ID_LIST.filter((id) => {
            const now = threadsRef.current[id] ?? NO_TURNS;
            const confirmed = confirmedRef.current[id] ?? NO_TURNS;
            return now !== confirmed && (now.length > 0 || confirmed.length > 0);
        });
    }

    function saveInFlight() {
        return Object.keys(inFlightRef.current).length > 0;
    }

    function saveRequest(id, turns, keepalive = false) {
        writerRef.current ??= { id: newWriterId(), seq: 0 };
        writerRef.current.seq += 1;
        return {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                agent: id,
                turns: cleanThread(turns),
                writer: { ...writerRef.current },
                // What this copy was built on, so the server can merge in
                // changes made meanwhile on another device.
                base: versionsRef.current[id] ?? 0,
                // The turns of that version: the confirmed copy, trimmed the
                // way the server stored it.
                seen: cleanThread(confirmedRef.current[id] ?? NO_TURNS).map((turn) => turn.id)
            }),
            keepalive
        };
    }

    // Returns 'retry' when a save failed in a way worth retrying soon, 'stop'
    // when every failure was a request the server will keep refusing (retrying
    // those every few seconds would never succeed; the next change tries again).
    async function saveChanged() {
        let failed = false;
        let retry = false;
        for (const id of unconfirmedAgents()) {
            const turns = threadsRef.current[id] ?? NO_TURNS;
            inFlightRef.current = { ...inFlightRef.current, [id]: turns };
            saveCountRef.current += 1;
            try {
                const response = await fetch('/api/agents/chats', saveRequest(id, turns));
                if (response.status === 401) {
                    // Signed out elsewhere or the session expired: stop and ask
                    // to sign in, rather than retrying forever.
                    setUser(null);
                    return null;
                }
                if (!response.ok) {
                    const permanent = response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status);
                    throw Object.assign(new Error(`HTTP ${response.status}`), { permanent });
                }
                const result = await response.json();
                if (!result.stale) versionsRef.current = { ...versionsRef.current, [id]: result.version };
                if (result.merged && Array.isArray(result.turns)) {
                    // Another device changed this chat meanwhile and the server
                    // merged both. Show the merged chat, keeping anything added
                    // here since this save was sent.
                    confirmedRef.current = { ...confirmedRef.current, [id]: result.turns };
                    const sentIds = turns.map((turn) => turn.id);
                    setThreads((all) => ({ ...all, [id]: mergeThreads(result.turns, all[id] ?? NO_TURNS, sentIds) }));
                } else {
                    confirmedRef.current = { ...confirmedRef.current, [id]: turns };
                }
            } catch (error) {
                failed = true;
                if (!error.permanent) retry = true;
            } finally {
                const stillInFlight = { ...inFlightRef.current };
                delete stillInFlight[id];
                inFlightRef.current = stillInFlight;
            }
        }
        setSyncProblem(failed ? 'save' : null);
        return retry ? 'retry' : failed ? 'stop' : null;
    }

    function scheduleSave(delay = busyRef.current ? 4000 : 1500) {
        if (saveTimerRef.current) return;
        saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            savingRef.current = savingRef.current.then(async () => {
                if ((await saveChanged()) === 'retry') scheduleSave(5000);
            });
        }, delay);
    }

    useEffect(() => {
        threadsRef.current = threads;
        if (user && restoredFor === user.id && unconfirmedAgents().length) scheduleSave();
    }, [threads, user, restoredFor]);

    // Declared after the effect above so it sees the latest chats.
    useEffect(() => {
        busyRef.current = busy;
        // A finished reply is saved right away rather than on the slower
        // while-streaming timer that was set when the question was sent.
        if (!busy && user && restoredFor === user.id && unconfirmedAgents().length) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
            scheduleSave(300);
        }
    }, [busy]);

    useEffect(() => {
        if (!user || restoredFor !== user.id) return;
        // As the page closes, send every chat the server has not confirmed, all
        // at once (there is no time to wait between them). Browsers cap such
        // requests at 64 KB in total, so larger chats rely on the regular save.
        // Nothing is marked as saved here: if the page comes back (the back
        // button), those chats are still unconfirmed and are saved normally.
        const onExit = () => {
            let budget = 60_000;
            for (const id of unconfirmedAgents()) {
                const request = saveRequest(id, threadsRef.current[id] ?? NO_TURNS, true);
                const bytes = new TextEncoder().encode(request.body).length;
                if (bytes > budget) continue;
                budget -= bytes;
                fetch('/api/agents/chats', request).catch(() => {});
            }
        };
        // Picks up what was written on another device: when coming back to the
        // tab, and every few seconds while the tab is open (a cheap versions
        // check first, the chats only if one moved). Only when every change
        // here is confirmed and no save is on its way: otherwise the server
        // copy could be older than this page's.
        const quiet = () =>
            document.visibilityState === 'visible' && !busyRef.current && !unconfirmedAgents().length && !saveInFlight();
        const onReturn = async ({ onlyIfChanged = false } = {}) => {
            if (!quiet()) return;
            const savesBefore = saveCountRef.current;
            if (onlyIfChanged) {
                const versions = await fetchVersions();
                if (!versions || sameVersions(versions, versionsRef.current)) return;
                if (!quiet() || saveCountRef.current !== savesBefore) return;
            }
            const saved = await fetchSavedChats();
            if (!saved || busyRef.current || unconfirmedAgents().length || saveInFlight()) return;
            if (saveCountRef.current !== savesBefore) return;
            confirmedRef.current = saved.threads;
            versionsRef.current = saved.versions;
            setThreads(saved.threads);
        };
        const onVisibility = () => onReturn();
        const poll = setInterval(() => onReturn({ onlyIfChanged: true }), LIVE_CHECK_MS);
        window.addEventListener('pagehide', onExit);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(poll);
            window.removeEventListener('pagehide', onExit);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [user, restoredFor]);

    // Follow the reply as it grows, unless the reader has scrolled up to read.
    const last = thread[thread.length - 1];
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        if (list.scrollHeight - list.scrollTop - list.clientHeight < 160) list.scrollTop = list.scrollHeight;
    }, [thread.length, last?.content, agentId]);

    function patchTurn(forAgent, id, patch) {
        setThreads((all) => ({
            ...all,
            [forAgent]: (all[forAgent] ?? []).map((turn) =>
                turn.id === id ? { ...turn, ...(typeof patch === 'function' ? patch(turn) : patch) } : turn
            )
        }));
    }

    async function send(text) {
        const message = text.trim();
        if (!message || busy) return;

        const forAgent = agentId;
        const history = historyOf(thread);
        const replyId = newId();
        setThreads((all) => ({
            ...all,
            [forAgent]: [
                ...(all[forAgent] ?? []),
                { id: newId(), role: 'user', content: message },
                { id: replyId, role: 'assistant', content: '', state: 'streaming' }
            ]
        }));
        setDrafts((all) => ({ ...all, [forAgent]: '' }));
        setBusy(forAgent);

        const controller = new AbortController();
        controllerRef.current = controller;
        try {
            await streamReply({
                agent: forAgent,
                history,
                message,
                signal: controller.signal,
                onEvent(event) {
                    if (event.type === 'text') {
                        patchTurn(forAgent, replyId, (turn) => ({ content: turn.content + event.text, activity: null }));
                    } else if (event.type === 'searching' || event.type === 'reading') {
                        patchTurn(forAgent, replyId, { activity: event.type });
                    } else if (event.type === 'source') {
                        patchTurn(forAgent, replyId, (turn) => ({ sources: addSource(turn.sources, event) }));
                    } else if (event.type === 'refused') {
                        patchTurn(forAgent, replyId, {
                            content: '',
                            state: 'refused',
                            note: 'הסוכן לא יכול לענות על הבקשה הזו. נסו לנסח אותה אחרת.'
                        });
                    } else if (event.type === 'error') {
                        patchTurn(forAgent, replyId, { state: 'error', note: event.message });
                    } else if (event.type === 'truncated') {
                        patchTurn(forAgent, replyId, { state: 'truncated', note: 'התשובה ארוכה מדי ונקטעה. אפשר לבקש "תמשיך".' });
                    } else if (event.type === 'done') {
                        patchTurn(forAgent, replyId, { state: 'done' });
                    }
                }
            });
            // A stream that ends without a closing event was cut off in transit.
            patchTurn(forAgent, replyId, (turn) =>
                turn.state === 'streaming' ? { state: 'error', note: 'החיבור נקטע לפני שהתשובה הסתיימה. נסו שוב.' } : {}
            );
        } catch (failure) {
            if (failure.name === 'AbortError') {
                patchTurn(forAgent, replyId, { state: 'stopped', note: 'עצרת את התשובה.' });
            } else {
                controller.abort();
                patchTurn(forAgent, replyId, { state: 'error', note: failure.message });
                if (failure instanceof SignedOutError) setUser(null);
            }
        } finally {
            controllerRef.current = null;
            setBusy(null);
        }
    }

    function clearThread() {
        if (busy === agentId) controllerRef.current?.abort();
        setThreads((all) => ({ ...all, [agentId]: [] }));
    }

    if (user === undefined) return <div className="min-h-[100dvh]" />;
    if (!user) return <SignedOut />;

    return (
        <div className="flex flex-col h-[100dvh]">
            <header className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b sm:px-6 border-slate-200">
                <div className="min-w-0">
                    <h1 className="text-lg font-extrabold leading-tight">צ׳אט עם הסוכנים</h1>
                    <p className="text-xs truncate text-slate-500">מחובר/ת בתור {user.name}</p>
                    {syncProblem === 'load' && (
                        <p className="text-xs text-rose-700">לא הצלחנו לטעון את השיחות השמורות. מנסים שוב; שיחות חדשות יישמרו כשזה יצליח.</p>
                    )}
                    {syncProblem === 'save' && <p className="text-xs text-amber-700">השיחה עוד לא נשמרה בחשבון. ננסה שוב בעוד רגע.</p>}
                </div>
                <a href="/agents.html" className="text-sm font-semibold text-indigo-600 shrink-0 hover:text-indigo-800">
                    כל הסוכנים
                </a>
            </header>

            <div className="flex flex-col flex-1 min-h-0 md:flex-row">
                <nav
                    aria-label="בחירת סוכן"
                    className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b md:flex-col md:w-64 md:overflow-y-auto md:border-b-0 md:border-l border-slate-200 shrink-0"
                >
                    {AGENTS.map((item) => {
                        const active = item.id === agentId;
                        const count = (threads[item.id] ?? []).filter((turn) => turn.role === 'user').length;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setAgentId(item.id)}
                                aria-current={active ? 'true' : undefined}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-right shrink-0 transition ring-1 ${
                                    active ? 'bg-indigo-50 ring-indigo-200' : 'ring-transparent hover:bg-slate-50'
                                }`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} aria-hidden="true" />
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold whitespace-nowrap">{item.label}</span>
                                    <span dir="ltr" className="block font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                        {item.id}
                                    </span>
                                </span>
                                {busy === item.id ? (
                                    <span className="text-[11px] text-indigo-600 whitespace-nowrap ms-auto">עונה…</span>
                                ) : count > 0 ? (
                                    <span className="text-[11px] text-slate-400 tabular-nums ms-auto">{count}</span>
                                ) : null}
                            </button>
                        );
                    })}
                </nav>

                <main className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b sm:px-6 border-slate-200 bg-white/70">
                        <div className="flex items-center min-w-0 gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ring-1 ${agent.tint}`}>{agent.label}</span>
                            <span dir="ltr" className="font-mono text-sm truncate text-slate-600">
                                {agent.id}
                            </span>
                        </div>
                        {thread.length > 0 && (
                            <button
                                type="button"
                                onClick={clearThread}
                                className="text-sm font-semibold shrink-0 text-slate-500 hover:text-slate-800"
                            >
                                שיחה חדשה
                            </button>
                        )}
                    </div>

                    <div ref={listRef} className="flex-1 min-h-0 px-4 py-5 overflow-y-auto sm:px-6">
                        {thread.length === 0 ? (
                            <EmptyState agent={agent} onPick={(text) => setDrafts((all) => ({ ...all, [agentId]: text }))} />
                        ) : (
                            <ol className="flex flex-col max-w-3xl gap-5 mx-auto">
                                {thread.map((turn) => (
                                    <Turn key={turn.id} turn={turn} />
                                ))}
                            </ol>
                        )}
                    </div>

                    <Composer
                        value={draft}
                        onChange={(text) => setDrafts((all) => ({ ...all, [agentId]: text }))}
                        onSend={() => send(draft)}
                        onStop={() => controllerRef.current?.abort()}
                        answering={busy === agentId}
                        blocked={Boolean(busy) && busy !== agentId}
                        agentLabel={agent.label}
                    />
                </main>
            </div>
        </div>
    );
}

function EmptyState({ agent, onPick }) {
    return (
        <div className="max-w-xl py-8 mx-auto text-center">
            <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ring-1 ${agent.tint}`}>{agent.label}</span>
            <p className="mt-4 text-slate-600">{agent.summary}</p>
            <p className="mt-6 text-xs font-semibold tracking-wide text-slate-400">דוגמה לבקשה</p>
            <button
                type="button"
                onClick={() => onPick(agent.example)}
                className="px-4 py-2.5 mt-2 text-sm bg-white border rounded-xl border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
            >
                {agent.example}
            </button>
            <p className="mt-6 text-xs text-slate-400">בצ׳אט הסוכנים לא רואים את הקבצים שלך, אז הדביקו את הקוד או הפרטים הרלוונטיים. הם כן יכולים לחפש ברשת ולקרוא קישורים שתדביקו.</p>
            <p className="mt-1 text-xs text-slate-400">השיחות נשמרות בחשבון שלך ומופיעות בכל מכשיר שתתחברו ממנו.</p>
        </div>
    );
}

function Turn({ turn }) {
    if (turn.role === 'user') {
        return (
            <li className="self-start max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-md bg-indigo-600 text-white whitespace-pre-wrap break-words">
                {turn.content}
            </li>
        );
    }

    const streaming = turn.state === 'streaming';
    const status = !streaming ? null : ACTIVITY[turn.activity] ?? (turn.content ? null : 'הסוכן חושב…');
    const noteTone = turn.state === 'error' || turn.state === 'refused' ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100';
    // A refused reply's text is discarded, and so are the pages it cited.
    const sources = turn.state === 'refused' ? [] : turn.sources ?? [];
    return (
        <li className="w-full">
            {status && !turn.content && <p className="text-sm text-slate-400 animate-pulse">{status}</p>}
            {turn.content && (
                <MarkdownToJsx
                    className="text-[15px] leading-relaxed pilot-md agents-md text-slate-800 break-words"
                    options={MARKDOWN_OPTIONS}
                >
                    {turn.content}
                </MarkdownToJsx>
            )}
            {status && turn.content && <p className="mt-2 text-sm text-slate-400 animate-pulse">{status}</p>}
            {sources.length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-200">
                    <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-500">מקורות</p>
                    <ol className="space-y-1 text-sm list-decimal list-inside text-slate-500">
                        {sources.map((source) => (
                            <li key={source.url} className="break-words">
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 underline-offset-2 hover:underline"
                                >
                                    {source.title || source.host}
                                </a>{' '}
                                <span dir="ltr" className="text-xs text-slate-400">
                                    {source.host}
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
            {turn.note && <p className={`mt-2 text-sm px-3 py-2 rounded-lg ${noteTone}`}>{turn.note}</p>}
        </li>
    );
}

// Keeps each cited page once, in first-cited order. Only http(s) links are
// shown: the URL comes from search results, not from this site.
function addSource(sources = [], { url, title }) {
    let host;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return sources;
        host = parsed.hostname.replace(/^www\./, '');
    } catch {
        return sources;
    }
    if (sources.some((source) => source.url === url)) return sources;
    return [...sources, { url, title: title?.trim() || null, host }];
}

function Composer({ value, onChange, onSend, onStop, answering, blocked, agentLabel }) {
    function onKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!answering && !blocked) onSend();
        }
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (!answering && !blocked) onSend();
            }}
            className="px-4 pt-3 pb-4 bg-white border-t sm:px-6 border-slate-200"
        >
            <div className="flex items-end max-w-3xl gap-2 mx-auto">
                <label htmlFor="agent-message" className="sr-only">
                    הודעה לסוכן {agentLabel}
                </label>
                <textarea
                    id="agent-message"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={onKeyDown}
                    rows={3}
                    maxLength={12000}
                    placeholder={`כתבו לסוכן ${agentLabel}…`}
                    className="flex-1 px-3 py-2.5 text-[15px] border rounded-xl outline-none resize-y border-slate-300 min-h-[3rem] max-h-64 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                {answering ? (
                    <button
                        type="button"
                        onClick={onStop}
                        className="px-4 py-2.5 font-bold border rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                        עצור
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={!value.trim() || blocked}
                        className="px-5 py-2.5 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        שלח
                    </button>
                )}
            </div>
            {blocked ? (
                <p className="max-w-3xl mx-auto mt-2 text-xs text-slate-500">סוכן אחר עונה כרגע. אפשר לשלוח כשהוא יסיים.</p>
            ) : (
                <p className="hidden max-w-3xl mx-auto mt-2 text-xs sm:block text-slate-400">Enter לשליחה · Shift+Enter לשורה חדשה</p>
            )}
        </form>
    );
}

function SignedOut() {
    return (
        <div className="grid min-h-[100dvh] px-4 place-items-center">
            <div className="w-full max-w-md p-8 text-center bg-white border shadow-sm rounded-2xl border-slate-200">
                <h1 className="text-2xl font-extrabold">צ׳אט עם הסוכנים</h1>
                <p className="mt-3 text-slate-600">
                    כדי לדבר עם הסוכנים צריך להתחבר. ההתחברות משותפת לאפליקציית מסלול, ואחריה חוזרים לכאן.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                    <a href="/pilot" className="px-5 py-2.5 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
                        להתחברות
                    </a>
                    <a href="/agents.html" className="px-5 py-2.5 font-bold border rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50">
                        לרשימת הסוכנים
                    </a>
                </div>
            </div>
        </div>
    );
}
