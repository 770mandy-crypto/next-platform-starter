'use client';

import MarkdownToJsx from 'markdown-to-jsx';
import { useEffect, useRef, useState } from 'react';
import { AGENTS, getAgent } from 'lib/agents/catalog';

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
}

// Only finished text goes back to the server as context: a refused or failed
// reply is left out so the agent does not build on it.
function historyOf(thread) {
    return thread
        .filter((turn) => turn.role === 'user' || ['done', 'truncated', 'stopped'].includes(turn.state))
        .filter((turn) => turn.content)
        .map(({ role, content }) => ({ role, content }));
}

let counter = 0;
const newId = () => `m${Date.now().toString(36)}${(counter += 1)}`;

export default function AgentChatPage() {
    const [user, setUser] = useState(undefined); // undefined while checking
    const [agentId, setAgentId] = useState(AGENTS[0].id);
    const [threads, setThreads] = useState({});
    const [drafts, setDrafts] = useState({});
    const [busy, setBusy] = useState(null); // id of the agent currently answering
    const controllerRef = useRef(null);
    const listRef = useRef(null);

    const agent = getAgent(agentId);
    const thread = threads[agentId] ?? [];
    const draft = drafts[agentId] ?? '';

    useEffect(() => {
        fetch('/api/pilot/auth/me')
            .then((response) => response.json())
            .then((data) => setUser(data.user ?? null))
            .catch(() => setUser(null));
    }, []);

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
                        patchTurn(forAgent, replyId, (turn) => ({ content: turn.content + event.text }));
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
            } else if (failure instanceof SignedOutError) {
                setUser(null);
            } else {
                patchTurn(forAgent, replyId, { state: 'error', note: failure.message });
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
            <p className="mt-6 text-xs text-slate-400">בצ׳אט הסוכנים לא רואים את הקבצים שלך. הדביקו את הקוד או הפרטים הרלוונטיים.</p>
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

    const waiting = turn.state === 'streaming' && !turn.content;
    const noteTone = turn.state === 'error' || turn.state === 'refused' ? 'text-rose-700 bg-rose-50' : 'text-slate-600 bg-slate-100';
    return (
        <li className="w-full">
            {waiting && <p className="text-sm text-slate-400 animate-pulse">הסוכן חושב…</p>}
            {turn.content && (
                <MarkdownToJsx className="text-[15px] leading-relaxed pilot-md agents-md text-slate-800 break-words">
                    {turn.content}
                </MarkdownToJsx>
            )}
            {turn.note && <p className={`mt-2 text-sm px-3 py-2 rounded-lg ${noteTone}`}>{turn.note}</p>}
        </li>
    );
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
