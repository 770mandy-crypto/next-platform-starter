'use client';

import MarkdownToJsx from 'markdown-to-jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTION_KINDS, AGENTS, getAgent } from 'lib/mendi/agents';

const MISSION_POLL_MS = 1_500;
const STATE_POLL_MS = 10_000;
const LIVE = ['queued', 'running'];

const TOOL_LABELS = {
    delegate: 'מעביר משימה',
    zoom_list_recordings: 'מחפש פגישות ב-Zoom',
    zoom_get_transcript: 'קורא תמלול',
    create_presentation: 'בונה מצגת',
    send_email: 'מכין מייל',
    send_whatsapp: 'מכין הודעת WhatsApp',
    create_calendar_invite: 'מכין זימון',
    add_task: 'מוסיף משימה',
    list_tasks: 'בודק משימות',
    update_task: 'מעדכן משימה',
    create_spreadsheet: 'מכין טבלה',
    list_files: 'מחפש קבצים',
    web_search: 'מחפש ברשת',
    web_fetch: 'קורא עמוד'
};

const ACTION_STATUS = {
    pending: { label: 'ממתין לאישור', tone: 'bg-amber-400/15 text-amber-300 ring-amber-400/30' },
    sending: { label: 'נשלח…', tone: 'bg-sky-400/15 text-sky-300 ring-sky-400/30' },
    sent: { label: 'נשלח', tone: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' },
    rejected: { label: 'נדחה', tone: 'bg-slate-400/15 text-slate-300 ring-slate-400/30' },
    failed: { label: 'נכשל', tone: 'bg-rose-400/15 text-rose-300 ring-rose-400/30' }
};

const FILE_ICONS = { presentation: '📊', invite: '📅', spreadsheet: '📈' };

class SignedOutError extends Error {}

async function api(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
        cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new SignedOutError(data.error);
    if (!response.ok) throw Object.assign(new Error(data.error || `שגיאה ${response.status}`), { data });
    return data;
}

const MARKDOWN_OPTIONS = {
    disableParsingRawHTML: true,
    overrides: {
        img: ({ alt }) => (alt ? <span className="text-slate-400">[{alt}]</span> : null),
        a: ({ href, children }) =>
            /^https?:\/\//.test(href ?? '') ? (
                <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-300 underline">
                    {children}
                </a>
            ) : (
                <span>{children}</span>
            )
    }
};

function Markdown({ children }) {
    return (
        <div className="pilot-md studio-md mendi-md text-[15px] leading-7 text-slate-200">
            <MarkdownToJsx options={MARKDOWN_OPTIONS}>{children}</MarkdownToJsx>
        </div>
    );
}

const timeOf = (iso) =>
    iso ? new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
const dayTimeOf = (iso) =>
    iso ? new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function AgentBadge({ id, size = 'sm' }) {
    const agent = getAgent(id);
    if (!agent) return null;
    const box = size === 'lg' ? 'w-10 h-10 text-xl' : 'w-7 h-7 text-sm';
    return (
        <span className={`inline-grid place-items-center shrink-0 rounded-xl ${agent.color} ${box}`} aria-hidden>
            {agent.icon}
        </span>
    );
}

// --- Page --------------------------------------------------------------------

export default function MendiPage() {
    const [user, setUser] = useState(undefined);
    const [room, setRoom] = useState('manager');
    const [missions, setMissions] = useState([]);
    const [side, setSide] = useState(null);
    const [panel, setPanel] = useState('approvals');
    const [mobileTab, setMobileTab] = useState('chat');
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const endRef = useRef(null);

    const signedOut = useCallback((caught) => {
        if (caught instanceof SignedOutError) {
            setUser(null);
            return true;
        }
        return false;
    }, []);

    useEffect(() => {
        api('/api/pilot/auth/me')
            .then((data) => setUser(data.user ?? null))
            .catch(() => setUser(null));
    }, []);

    const loadSide = useCallback(async () => {
        try {
            setSide(await api('/api/mendi/state'));
        } catch (caught) {
            signedOut(caught);
        }
    }, [signedOut]);

    const loadRoom = useCallback(
        async (which) => {
            try {
                const data = await api(`/api/mendi/missions?room=${which}`);
                setMissions(data.missions);
            } catch (caught) {
                if (!signedOut(caught)) setError(caught.message);
            }
        },
        [signedOut]
    );

    useEffect(() => {
        if (!user) return;
        loadSide();
        loadRoom(room);
    }, [user, room, loadSide, loadRoom]);

    // Watch the mission that is still running, if any.
    const live = missions.find((mission) => LIVE.includes(mission.status));
    const liveId = live?.id;
    useEffect(() => {
        if (!user || !liveId) return undefined;
        let stopped = false;
        const tick = async () => {
            try {
                const { mission } = await api(`/api/mendi/missions/${liveId}`);
                if (stopped) return;
                setMissions((current) => current.map((item) => (item.id === mission.id ? mission : item)));
                if (!LIVE.includes(mission.status)) loadSide();
            } catch (caught) {
                signedOut(caught);
            }
        };
        const timer = setInterval(tick, MISSION_POLL_MS);
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, [user, liveId, loadSide, signedOut]);

    // Approvals and files can change while a mission runs.
    useEffect(() => {
        if (!user) return undefined;
        const timer = setInterval(loadSide, liveId ? 4_000 : STATE_POLL_MS);
        return () => clearInterval(timer);
    }, [user, liveId, loadSide]);

    const missionCount = missions.length;
    const lastReplyLength = missions.at(-1)?.reply?.length ?? 0;
    const lastSteps = missions.at(-1)?.steps?.length ?? 0;
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [missionCount, lastReplyLength, lastSteps]);

    async function send(text) {
        const message = text.trim();
        if (!message || sending || live) return;
        setSending(true);
        setError(null);
        try {
            const { mission } = await api('/api/mendi/missions', {
                method: 'POST',
                body: JSON.stringify({ room, message })
            });
            setDraft('');
            setMissions((current) => [...current, mission]);
            setMobileTab('chat');
        } catch (caught) {
            if (!signedOut(caught)) setError(caught.message);
        } finally {
            setSending(false);
        }
    }

    function openRoom(id) {
        setRoom(id);
        setMissions([]);
        setMobileTab('chat');
    }

    if (user === undefined) return <div className="grid min-h-[100dvh] place-items-center text-slate-400">טוען…</div>;
    if (user === null) return <SignIn onSignedIn={setUser} />;

    const pending = (side?.actions ?? []).filter((action) => action.status === 'pending');
    const agent = getAgent(room);
    const busy = Boolean(live) || Boolean(side?.running && side.running !== liveId);

    const team = <TeamList room={room} onOpen={openRoom} connectors={side?.connectors} runningSteps={live?.steps ?? []} live={live} />;
    const panels = (
        <SidePanels
            panel={panel}
            setPanel={setPanel}
            side={side}
            pendingCount={pending.length}
            reload={loadSide}
            onSignedOut={signedOut}
        />
    );

    return (
        <div className="flex flex-col h-[100dvh]">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0e1430]/90 backdrop-blur">
                <div className="flex items-center gap-2">
                    <span className="grid w-9 h-9 text-lg font-black rounded-xl place-items-center bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                        M
                    </span>
                    <div className="leading-tight">
                        <h1 className="m-0 text-base font-extrabold tracking-wide">MENDI AI</h1>
                        <p className="text-xs text-slate-400">חדר הפיקוד של {user.name}</p>
                    </div>
                </div>
                {side && !side.ai && (
                    <span className="hidden px-2 py-1 text-xs rounded-lg sm:inline bg-rose-500/15 text-rose-300">
                        חסר ANTHROPIC_API_KEY
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setPanel('approvals');
                        setMobileTab('panels');
                    }}
                    className="relative px-3 py-1.5 text-sm rounded-xl ms-auto bg-white/5 hover:bg-white/10"
                >
                    אישורים
                    {pending.length > 0 && (
                        <span className="absolute -top-1.5 -left-1.5 grid min-w-5 h-5 px-1 text-xs font-bold rounded-full place-items-center bg-amber-400 text-slate-900">
                            {pending.length}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={async () => {
                        await fetch('/api/pilot/auth/logout', { method: 'POST' }).catch(() => {});
                        setUser(null);
                    }}
                    className="hidden text-sm sm:inline text-slate-400 hover:text-white"
                >
                    יציאה
                </button>
            </header>

            <div className="grid flex-1 min-h-0 lg:grid-cols-[290px_minmax(0,1fr)_380px]">
                <aside className={`${mobileTab === 'team' ? 'block' : 'hidden'} lg:block min-h-0 overflow-y-auto border-e border-white/10 bg-[#0e1430]/50`}>
                    {team}
                </aside>

                <section className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`}>
                    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5">
                        <AgentBadge id={room} />
                        <div className="min-w-0">
                            <p className="font-bold truncate">{room === 'manager' ? 'חדר משותף · המנהל הראשי' : agent.label}</p>
                            <p className="text-xs truncate text-slate-400">
                                {room === 'manager' ? 'כתוב משימה אחת, המנהל יחלק אותה בין כל הסוכנים' : agent.name}
                            </p>
                        </div>
                        {room !== 'manager' && (
                            <button type="button" onClick={() => openRoom('manager')} className="text-xs ms-auto text-indigo-300 hover:underline">
                                לחדר המשותף
                            </button>
                        )}
                    </div>
                    <div className="flex-1 px-3 py-5 overflow-y-auto sm:px-6">
                        <div className="max-w-3xl mx-auto space-y-6">
                            {!missions.length && <Welcome agentId={room} onPick={send} />}
                            {missions.map((mission) => (
                                <Exchange key={mission.id} mission={mission} onApprovals={() => { setPanel('approvals'); setMobileTab('panels'); }} />
                            ))}
                            <div ref={endRef} />
                        </div>
                    </div>
                    <form
                        className="px-3 py-3 border-t sm:px-6 border-white/10 bg-[#0e1430]/70"
                        onSubmit={(event) => {
                            event.preventDefault();
                            send(draft);
                        }}
                    >
                        {error && <p className="max-w-3xl mx-auto mb-2 text-sm text-rose-300">{error}</p>}
                        <div className="flex items-end max-w-3xl gap-2 mx-auto">
                            <textarea
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                        event.preventDefault();
                                        send(draft);
                                    }
                                }}
                                rows={2}
                                maxLength={60000}
                                placeholder={room === 'manager' ? 'מה לעשות? למשל: תטפל לי בפגישה האחרונה…' : `משימה ל${agent.label}…`}
                                className="flex-1 px-4 py-3 text-base text-white border resize-none rounded-2xl bg-slate-900/80 border-white/10 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={!draft.trim() || sending || busy}
                                className="px-5 py-3 font-bold text-white rounded-2xl bg-gradient-to-l from-indigo-600 to-fuchsia-600 disabled:opacity-40"
                            >
                                {busy ? 'עובדים…' : 'שלח'}
                            </button>
                        </div>
                        {busy && (
                            <p className="max-w-3xl mx-auto mt-1.5 text-xs text-slate-400">
                                הצוות עובד ברקע. אפשר לסגור את הדף ולחזור, גם מהטלפון.
                            </p>
                        )}
                    </form>
                </section>

                <aside className={`${mobileTab === 'panels' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 border-s border-white/10 bg-[#0e1430]/50`}>
                    {panels}
                </aside>
            </div>

            <nav className="grid grid-cols-3 border-t lg:hidden border-white/10 bg-[#0e1430]">
                {[
                    ['team', 'הסוכנים', '👥'],
                    ['chat', 'צ׳אט', '💬'],
                    ['panels', 'בקרה', pending.length ? `🔔${pending.length}` : '🗂️']
                ].map(([id, label, icon]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setMobileTab(id)}
                        className={`py-2.5 text-xs flex flex-col items-center gap-0.5 ${mobileTab === id ? 'text-white' : 'text-slate-500'}`}
                    >
                        <span className="text-base">{icon}</span>
                        {label}
                    </button>
                ))}
            </nav>
        </div>
    );
}

// --- Team ----------------------------------------------------------------------

function TeamList({ room, onOpen, connectors, live }) {
    const connected = Object.fromEntries((connectors ?? []).map((item) => [item.id, item.connected]));
    const working = new Set(
        live ? [live.agentId, ...(live.steps ?? []).filter((step) => step.status === 'running').map((step) => step.agent)] : []
    );
    return (
        <div className="p-3 space-y-1.5">
            <p className="px-2 pt-1 pb-2 text-xs font-bold tracking-wider text-slate-400">הסוכנים שלי</p>
            {AGENTS.map((agent) => {
                const missing = agent.needs.filter((need) => connectors && !connected[need]);
                const active = room === agent.id;
                return (
                    <button
                        key={agent.id}
                        type="button"
                        onClick={() => onOpen(agent.id)}
                        className={`w-full text-right flex items-start gap-3 p-2.5 rounded-2xl transition ${
                            active ? 'bg-indigo-500/15 ring-1 ring-indigo-400/40' : 'hover:bg-white/5'
                        }`}
                    >
                        <AgentBadge id={agent.id} size="lg" />
                        <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                                <span className="font-bold truncate">{agent.label}</span>
                                {working.has(agent.id) ? (
                                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" title="עובד עכשיו" />
                                ) : (
                                    <span className={`w-2 h-2 rounded-full ${missing.length ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                )}
                            </span>
                            <span className="block text-[11px] tracking-wide text-slate-500">{agent.name}</span>
                            <span className="block mt-0.5 text-xs leading-5 text-slate-400 line-clamp-2">{agent.summary}</span>
                            {missing.length > 0 && (
                                <span className="block mt-1 text-[11px] text-amber-300/90">
                                    לא מחובר: {missing.map((id) => connectors.find((item) => item.id === id)?.label).join(', ')}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// --- Chat ----------------------------------------------------------------------

function Welcome({ agentId, onPick }) {
    const agent = getAgent(agentId);
    const examples =
        agentId === 'manager'
            ? [
                  agent.example,
                  'תחקור 3 מתחרים שלי, תכין דוח ומצגת קצרה עם הממצאים.',
                  'תארגן לי את השבוע: מה המשימות הפתוחות ומה הכי דחוף?',
                  'הנה התמלול של הפגישה (מודבק למטה). תסכם, תכין מצגת ותכין מייל למשתתפים.'
              ]
            : [agent.example];
    return (
        <div className="py-6 text-center">
            <div className="inline-block">
                <AgentBadge id={agentId} size="lg" />
            </div>
            <h2 className="mt-3 text-2xl font-extrabold">{agentId === 'manager' ? 'מה הצוות עושה היום?' : agent.label}</h2>
            <p className="max-w-lg mx-auto mt-2 text-slate-400">{agent.summary}</p>
            {agentId === 'manager' && (
                <p className="max-w-lg mx-auto mt-2 text-sm text-slate-500">
                    המנהל מחלק את העבודה בין הסוכנים, ואתה רואה כל אחד מהם עובד. מיילים והודעות נשלחים רק אחרי שתאשר.
                </p>
            )}
            <div className="grid max-w-2xl gap-2 mx-auto mt-6 sm:grid-cols-2">
                {examples.map((example) => (
                    <button
                        key={example}
                        type="button"
                        onClick={() => onPick(example)}
                        className="p-3 text-sm leading-6 text-right border rounded-2xl border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    >
                        {example}
                    </button>
                ))}
            </div>
        </div>
    );
}

function Exchange({ mission, onApprovals }) {
    const liveNow = LIVE.includes(mission.status);
    const pending = (mission.actions ?? []).filter((action) => action.status === 'pending');
    return (
        <div className="space-y-3">
            <div className="flex justify-start">
                <div className="max-w-[90%] px-4 py-2.5 text-white whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-indigo-600/80">
                    {mission.message.length > 1500 ? `${mission.message.slice(0, 1500)}…` : mission.message}
                    <span className="block mt-1 text-[11px] text-indigo-200/70">{timeOf(mission.createdAt)}</span>
                </div>
            </div>

            <div className="flex gap-3">
                <AgentBadge id={mission.agentId} />
                <div className="flex-1 min-w-0 space-y-3">
                    {mission.status === 'queued' && <p className="text-sm text-slate-400 animate-pulse">מתחיל לעבוד…</p>}

                    {(mission.steps ?? []).length > 0 && (
                        <div className="space-y-2">
                            {mission.steps.map((step) => (
                                <StepCard key={step.id} step={step} />
                            ))}
                        </div>
                    )}

                    {liveNow && <ActivityLine mission={mission} />}

                    {mission.reply && <Markdown>{mission.reply}</Markdown>}

                    {(mission.files ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {mission.files.map((file) => (
                                <FileChip key={file.id} file={file} />
                            ))}
                        </div>
                    )}

                    {pending.length > 0 && (
                        <button
                            type="button"
                            onClick={onApprovals}
                            className="w-full p-3 text-sm text-right border rounded-2xl border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
                        >
                            🔔 {pending.length === 1 ? 'פעולה אחת ממתינה' : `${pending.length} פעולות ממתינות`} לאישור שלך ·{' '}
                            {pending.map((action) => `${ACTION_KINDS[action.kind].label} אל ${action.to.join(', ')}`).join(' · ')}
                        </button>
                    )}

                    {mission.status === 'failed' && <p className="text-sm text-rose-300">{mission.error}</p>}
                    {mission.status === 'refused' && (
                        <p className="text-sm text-amber-300">הסוכן לא יכול לעזור בבקשה הזו. אפשר לנסח אותה אחרת.</p>
                    )}
                    {mission.truncated && (
                        <p className="text-xs text-slate-400">התשובה נקטעה. כתוב &quot;המשך&quot; כדי שהצוות ימשיך.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ActivityLine({ mission }) {
    const last = (mission.activity ?? []).at(-1);
    const running = (mission.steps ?? []).filter((step) => step.status === 'running');
    const who = running.length
        ? running.map((step) => getAgent(step.agent)?.label).join(' · ')
        : getAgent(mission.agentId)?.label;
    return (
        <p className="flex items-center gap-2 text-sm text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            {who} {last && last.ok === undefined ? `· ${TOOL_LABELS[last.tool] ?? last.tool}…` : 'עובד…'}
        </p>
    );
}

function StepCard({ step }) {
    const [open, setOpen] = useState(false);
    const agent = getAgent(step.agent);
    const icon = step.status === 'running' ? '⏳' : step.status === 'done' ? '✅' : '⚠️';
    return (
        <div className="border rounded-2xl border-white/10 bg-white/[0.03]">
            <button type="button" onClick={() => setOpen(!open)} className="flex items-start w-full gap-3 p-3 text-right">
                <AgentBadge id={step.agent} />
                <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 text-sm font-bold">
                        {agent?.label}
                        <span className={step.status === 'running' ? 'animate-pulse' : ''}>{icon}</span>
                    </span>
                    <span className={`block text-xs leading-5 text-slate-400 ${open ? '' : 'line-clamp-2'}`}>{step.task}</span>
                </span>
                <span className="text-xs text-slate-500">{open ? 'סגור' : 'פרטים'}</span>
            </button>
            {(step.files ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pb-3">
                    {step.files.map((file) => (
                        <FileChip key={file.id} file={file} />
                    ))}
                </div>
            )}
            {open && (
                <div className="px-4 pt-1 pb-4 border-t border-white/5">
                    {step.output ? <Markdown>{step.output}</Markdown> : <p className="text-sm text-slate-500">עוד אין פלט.</p>}
                </div>
            )}
        </div>
    );
}

function FileChip({ file }) {
    return (
        <a
            href={`/api/mendi/files/${file.id}`}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
        >
            <span>{FILE_ICONS[file.kind] ?? '📄'}</span>
            <span className="max-w-[16rem] truncate">{file.name}</span>
            <span className="text-xs text-indigo-300">הורדה</span>
        </a>
    );
}

// --- Side panels ---------------------------------------------------------------

function SidePanels({ panel, setPanel, side, pendingCount, reload, onSignedOut }) {
    const tabs = [
        ['approvals', `אישורים${pendingCount ? ` (${pendingCount})` : ''}`],
        ['files', 'קבצים'],
        ['tasks', 'משימות'],
        ['log', 'בקרה'],
        ['settings', 'הגדרות']
    ];
    return (
        <>
            <div className="flex gap-1 p-2 overflow-x-auto border-b border-white/10">
                {tabs.map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setPanel(id)}
                        className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-xl ${
                            panel === id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-y-auto">
                {!side ? (
                    <p className="text-sm text-slate-500">טוען…</p>
                ) : panel === 'approvals' ? (
                    <Approvals actions={side.actions} files={side.files} connectors={side.connectors} reload={reload} onSignedOut={onSignedOut} />
                ) : panel === 'files' ? (
                    <Files files={side.files} />
                ) : panel === 'tasks' ? (
                    <Tasks tasks={side.tasks} reload={reload} onSignedOut={onSignedOut} />
                ) : panel === 'log' ? (
                    <ActivityLog activity={side.activity} />
                ) : (
                    <Settings side={side} reload={reload} onSignedOut={onSignedOut} />
                )}
            </div>
        </>
    );
}

function Empty({ children }) {
    return <p className="p-4 text-sm leading-6 text-center text-slate-500">{children}</p>;
}

function Approvals({ actions, files, connectors, reload, onSignedOut }) {
    const pending = actions.filter((action) => action.status === 'pending');
    const done = actions.filter((action) => action.status !== 'pending').slice(0, 15);
    if (!actions.length) {
        return <Empty>כשסוכן מכין מייל או הודעת WhatsApp, היא מחכה כאן לאישור שלך. שום דבר לא יוצא בלי שתאשר.</Empty>;
    }
    return (
        <div className="space-y-3">
            {pending.map((action) => (
                <ApprovalCard key={action.id} action={action} files={files} connectors={connectors} reload={reload} onSignedOut={onSignedOut} />
            ))}
            {done.length > 0 && <p className="pt-2 text-xs font-bold text-slate-500">טופלו לאחרונה</p>}
            {done.map((action) => (
                <div key={action.id} className="p-3 text-sm border rounded-2xl border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <span>{ACTION_KINDS[action.kind].icon}</span>
                        <span className="flex-1 truncate">{action.subject ?? action.body.slice(0, 60)}</span>
                        <StatusPill status={action.status} />
                    </div>
                    <p className="mt-1 text-xs truncate text-slate-500">
                        אל {action.to.join(', ')} · {dayTimeOf(action.updatedAt ?? action.createdAt)}
                    </p>
                    {action.error && <p className="mt-1 text-xs text-rose-300">{action.error}</p>}
                </div>
            ))}
        </div>
    );
}

function StatusPill({ status }) {
    const info = ACTION_STATUS[status] ?? ACTION_STATUS.pending;
    return <span className={`px-2 py-0.5 text-[11px] rounded-full ring-1 ${info.tone}`}>{info.label}</span>;
}

function ApprovalCard({ action, files, connectors, reload, onSignedOut }) {
    const [subject, setSubject] = useState(action.subject ?? '');
    const [body, setBody] = useState(action.body);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const connected = connectors?.find((item) => item.id === action.kind)?.connected;
    const attached = (action.attachments ?? []).map((id) => files.find((file) => file.id === id) ?? { id, name: id });

    async function decide(decision) {
        setBusy(true);
        setError(null);
        try {
            await api(`/api/mendi/actions/${action.id}`, {
                method: 'POST',
                body: JSON.stringify({ decision, subject, body })
            });
        } catch (caught) {
            if (!onSignedOut(caught)) setError(caught.message);
        } finally {
            setBusy(false);
            reload();
        }
    }

    return (
        <div className="p-3 space-y-2 border rounded-2xl border-amber-400/25 bg-amber-400/[0.06]">
            <div className="flex items-center gap-2 text-sm">
                <AgentBadge id={action.agent} />
                <span className="font-bold">{ACTION_KINDS[action.kind].label}</span>
                <span className="text-xs text-slate-400">מ{getAgent(action.agent)?.label}</span>
                <span className="ms-auto">
                    <StatusPill status="pending" />
                </span>
            </div>
            <p className="text-xs break-words text-slate-300">
                אל: <span dir="ltr">{action.to.join(', ')}</span>
                {action.cc?.length ? (
                    <>
                        {' '}
                        · עותק: <span dir="ltr">{action.cc.join(', ')}</span>
                    </>
                ) : null}
            </p>
            {action.kind === 'email' && (
                <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl bg-slate-950/60 border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    aria-label="נושא"
                />
            )}
            <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={7}
                className="w-full px-3 py-2 text-sm leading-6 border rounded-xl bg-slate-950/60 border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                aria-label="תוכן"
            />
            {attached.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attached.map((file) => (
                        <FileChip key={file.id} file={file} />
                    ))}
                </div>
            )}
            {!connected && (
                <p className="text-xs text-amber-300">
                    {action.kind === 'email' ? 'שליחת מיילים' : 'WhatsApp'} עוד לא מחובר. חבר אותו (לשונית הגדרות) ואז אשר.
                </p>
            )}
            {error && <p className="text-xs text-rose-300">{error}</p>}
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={busy || !connected}
                    onClick={() => decide('approve')}
                    className="flex-1 py-2 text-sm font-bold rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                    {busy ? 'שולח…' : 'אשר ושלח'}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide('reject')}
                    className="px-4 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40"
                >
                    דחה
                </button>
            </div>
        </div>
    );
}

function Files({ files }) {
    if (!files.length) return <Empty>מצגות, זימונים וטבלאות שהסוכנים מכינים יופיעו כאן להורדה.</Empty>;
    return (
        <div className="space-y-2">
            {files.map((file) => (
                <a
                    key={file.id}
                    href={`/api/mendi/files/${file.id}`}
                    className="flex items-center gap-3 p-3 border rounded-2xl border-white/5 bg-white/[0.03] hover:bg-white/[0.07]"
                >
                    <span className="text-xl">{FILE_ICONS[file.kind] ?? '📄'}</span>
                    <span className="flex-1 min-w-0">
                        <span className="block text-sm truncate">{file.name}</span>
                        <span className="block text-xs text-slate-500">
                            {getAgent(file.agent)?.label} · {dayTimeOf(file.createdAt)} · {Math.max(1, Math.round(file.size / 1024))}KB
                        </span>
                    </span>
                    <span className="text-xs text-indigo-300">הורדה</span>
                </a>
            ))}
        </div>
    );
}

function Tasks({ tasks, reload, onSignedOut }) {
    const [title, setTitle] = useState('');
    const open = tasks.filter((task) => !task.done);
    const done = tasks.filter((task) => task.done).slice(0, 10);

    async function toggle(task) {
        try {
            await api(`/api/mendi/tasks/${task.id}`, { method: 'POST', body: JSON.stringify({ done: !task.done }) });
        } catch (caught) {
            onSignedOut(caught);
        }
        reload();
    }

    async function add(event) {
        event.preventDefault();
        if (!title.trim()) return;
        try {
            await api('/api/mendi/tasks', { method: 'POST', body: JSON.stringify({ title }) });
            setTitle('');
        } catch (caught) {
            onSignedOut(caught);
        }
        reload();
    }

    const row = (task) => (
        <label key={task.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5">
            <input type="checkbox" checked={task.done} onChange={() => toggle(task)} className="mt-1 accent-indigo-500" />
            <span className="flex-1 min-w-0">
                <span className={`block text-sm ${task.done ? 'line-through text-slate-500' : ''}`}>{task.title}</span>
                <span className="block text-xs text-slate-500">
                    {task.due ? `עד ${task.due.length > 10 ? dayTimeOf(task.due) : new Date(task.due).toLocaleDateString('he-IL')}` : ''}
                    {task.agent ? ` · ${getAgent(task.agent)?.label}` : ''}
                </span>
            </span>
        </label>
    );

    return (
        <div className="space-y-2">
            <form onSubmit={add} className="flex gap-2">
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="משימה חדשה…"
                    className="flex-1 px-3 py-2 text-sm border rounded-xl bg-slate-950/60 border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="px-3 text-sm rounded-xl bg-white/10 hover:bg-white/15">
                    הוסף
                </button>
            </form>
            {!tasks.length && <Empty>המזכיר וסוכן הישיבות מוסיפים לכאן משימות ותזכורות.</Empty>}
            {open.map(row)}
            {done.length > 0 && <p className="pt-2 text-xs font-bold text-slate-500">בוצעו</p>}
            {done.map(row)}
        </div>
    );
}

const LOG_ICONS = { step: '➡️', file: '📄', approval: '🔔', sent: '✅', rejected: '🚫', failed: '⚠️', task: '📝', mission: '🏁' };

function ActivityLog({ activity }) {
    if (!activity.length) return <Empty>כאן רואים מה כל סוכן עשה, מתי ובשביל איזו משימה.</Empty>;
    return (
        <ol className="space-y-1">
            {activity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 p-2 text-sm rounded-xl hover:bg-white/[0.03]">
                    <span>{LOG_ICONS[entry.kind] ?? '•'}</span>
                    <span className="flex-1 min-w-0">
                        <span className="block leading-6 break-words">{entry.summary}</span>
                        <span className="block text-xs text-slate-500">
                            {getAgent(entry.agent)?.label} · {dayTimeOf(entry.at)}
                        </span>
                    </span>
                </li>
            ))}
        </ol>
    );
}

function Settings({ side, reload, onSignedOut }) {
    const [auto, setAuto] = useState(side.settings.autoApprove);
    const [trusted, setTrusted] = useState(side.settings.trustedRecipients.join('\n'));
    const [saved, setSaved] = useState(null);

    async function save() {
        setSaved(null);
        try {
            const data = await api('/api/mendi/settings', {
                method: 'POST',
                body: JSON.stringify({ autoApprove: auto, trustedRecipients: trusted.split(/[\n,]+/) })
            });
            setTrusted(data.settings.trustedRecipients.join('\n'));
            setSaved('נשמר.');
            reload();
        } catch (caught) {
            if (!onSignedOut(caught)) setSaved(caught.message);
        }
    }

    return (
        <div className="space-y-5 text-sm">
            <section className="space-y-2">
                <h3 className="font-bold">חיבורים</h3>
                {side.connectors.map((item) => (
                    <div key={item.id} className="p-3 border rounded-2xl border-white/5 bg-white/[0.03]">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span className="font-bold">{item.label}</span>
                            <span className="text-xs ms-auto text-slate-400">{item.connected ? 'מחובר' : 'לא מחובר'}</span>
                        </div>
                        {!item.connected && (
                            <p className="mt-1.5 text-xs leading-5 text-slate-400">
                                {item.help} משתני סביבה:{' '}
                                <span dir="ltr" className="font-mono text-slate-300">
                                    {item.env.join(', ')}
                                </span>
                            </p>
                        )}
                    </div>
                ))}
            </section>

            <section className="space-y-2">
                <h3 className="font-bold">עצמאות הסוכנים</h3>
                <p className="text-xs leading-5 text-slate-400">
                    ברירת המחדל: הסוכנים עושים הכול, אבל כל מייל והודעה מחכים לאישור שלך. אפשר לאשר מראש סוג פעולה, והוא ייצא לבד
                    רק לנמענים שברשימה המהימנה למטה. לכל נמען אחר תמיד תתבקש אישור.
                </p>
                {Object.entries(ACTION_KINDS).map(([kind, info]) => (
                    <label key={kind} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                        <input
                            type="checkbox"
                            checked={auto[kind]}
                            onChange={(event) => setAuto({ ...auto, [kind]: event.target.checked })}
                            className="accent-indigo-500"
                        />
                        <span>
                            {info.icon} לשלוח {info.label} לבד לנמענים מהימנים
                        </span>
                    </label>
                ))}
                <label className="block">
                    <span className="block mb-1 text-xs text-slate-400">נמענים מהימנים (מייל או טלפון בכל שורה)</span>
                    <textarea
                        dir="ltr"
                        value={trusted}
                        onChange={(event) => setTrusted(event.target.value)}
                        rows={4}
                        placeholder={'me@example.com\n+972501234567'}
                        className="w-full px-3 py-2 font-mono text-xs border rounded-xl bg-slate-950/60 border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </label>
                <button type="button" onClick={save} className="px-4 py-2 font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500">
                    שמור
                </button>
                {saved && <span className="text-xs ms-3 text-slate-400">{saved}</span>}
            </section>
        </div>
    );
}

// --- Sign in -------------------------------------------------------------------

function SignIn({ onSignedIn }) {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const data = await api(`/api/pilot/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
            onSignedIn(data.user);
        } catch (caught) {
            setError(caught.message);
        } finally {
            setBusy(false);
        }
    }

    const field = (key, label, type = 'text', extra = {}) => (
        <label className="block">
            <span className="block mb-1 text-sm text-slate-400">{label}</span>
            <input
                type={type}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                required
                className="w-full px-4 py-3 text-base border rounded-xl bg-slate-950/60 border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...extra}
            />
        </label>
    );

    return (
        <div className="grid min-h-[100dvh] px-4 place-items-center">
            <div className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <span className="inline-grid w-14 h-14 text-2xl font-black rounded-2xl place-items-center bg-gradient-to-br from-indigo-500 to-fuchsia-500">
                        M
                    </span>
                    <h1 className="mt-3 mb-0 text-3xl font-extrabold tracking-wide">MENDI AI</h1>
                    <p className="mt-2 text-slate-400">צוות של 10 סוכני AI שעובדים בשבילך. אתה המנהל.</p>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4 border rounded-3xl bg-[#0e1430] border-white/10">
                    {mode === 'signup' && field('name', 'שם', 'text', { autoComplete: 'name' })}
                    {field('email', 'אימייל', 'email', { autoComplete: 'email', dir: 'ltr' })}
                    {field('password', 'סיסמה', 'password', {
                        autoComplete: mode === 'login' ? 'current-password' : 'new-password',
                        minLength: mode === 'signup' ? 8 : undefined,
                        dir: 'ltr'
                    })}
                    {error && <p className="text-sm text-rose-300">{error}</p>}
                    <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-3 font-bold rounded-xl bg-gradient-to-l from-indigo-600 to-fuchsia-600 disabled:opacity-50"
                    >
                        {busy ? '…' : mode === 'login' ? 'כניסה לחדר הפיקוד' : 'יצירת חשבון'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        className="w-full text-sm text-slate-400 hover:text-white"
                    >
                        {mode === 'login' ? 'אין לך חשבון? הרשמה' : 'כבר יש חשבון? כניסה'}
                    </button>
                </form>
                <p className="mt-4 text-xs text-center text-slate-500">החשבון משותף עם מסלול והסטודיו באתר הזה.</p>
            </div>
        </div>
    );
}
