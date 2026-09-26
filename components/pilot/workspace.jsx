'use client';

import MarkdownToJsx from 'markdown-to-jsx';
import { useEffect, useRef, useState } from 'react';
import { ACTIONS, MODULES, progressOf } from 'lib/pilot/policy';
import { Logo } from './onboarding';

const TABS = [
    { id: 'chat', icon: '💬', label: 'צ׳אט' },
    { id: 'plan', icon: '📋', label: 'תוכנית' },
    { id: 'tasks', icon: '✅', label: 'משימות' },
    { id: 'approvals', icon: '🔐', label: 'אישורים' },
    { id: 'outputs', icon: '🎨', label: 'תוצרים' },
    { id: 'memory', icon: '🧠', label: 'זיכרון' },
    { id: 'monitor', icon: '📊', label: 'התקדמות' }
];

const SUGGESTIONS = [
    'חקור את המתחרים העיקריים בתחום',
    'כתוב לי פוסט השקה ללינקדאין',
    'קבע לי פגישת עבודה מחר ב-10:00',
    'תנסח מייל ל-dana@example.com עם עדכון',
    'תזכור: התקציב שלי הוא 5,000 ₪'
];

function Badge({ children, tone = 'slate' }) {
    const tones = {
        slate: 'bg-slate-100 text-slate-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        amber: 'bg-amber-100 text-amber-800',
        green: 'bg-emerald-100 text-emerald-700',
        red: 'bg-red-100 text-red-700'
    };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${tones[tone]}`}>{children}</span>;
}

function ModuleTag({ id }) {
    const module = MODULES[id] ?? MODULES.agents;
    return (
        <Badge tone="indigo">
            {module.icon} {module.label}
        </Badge>
    );
}

function Card({ title, children, action }) {
    return (
        <section className="p-5 bg-white border shadow-sm rounded-2xl border-slate-200">
            {(title || action) && (
                <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

function ProgressBar({ percent }) {
    return (
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full transition-all rounded-full bg-gradient-to-l from-indigo-500 to-fuchsia-500" style={{ width: `${percent}%` }} />
        </div>
    );
}

// --- Chat ------------------------------------------------------------------

function ChatPanel({ state, send, onOpenApprovals }) {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const bottom = useRef(null);

    useEffect(() => {
        bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [state.messages.length, busy]);

    async function submit(message) {
        const value = (message ?? text).trim();
        if (!value || busy) return;
        setText('');
        setBusy(true);
        setError('');
        try {
            await send(value);
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(false);
        }
    }

    const actionsById = Object.fromEntries(state.actions.map((action) => [action.id, action]));

    return (
        <div className="flex flex-col h-[calc(100vh-11rem)] min-h-[480px] bg-white border shadow-sm rounded-2xl border-slate-200">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto sm:p-6">
                {state.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                                message.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                    : 'bg-slate-100 text-slate-800 rounded-bl-md'
                            }`}
                        >
                            {message.content}
                            {message.actionIds?.map((id) => {
                                const action = actionsById[id];
                                if (!action) return null;
                                return (
                                    <button
                                        key={id}
                                        onClick={onOpenApprovals}
                                        className="flex items-center w-full gap-2 px-3 py-2 mt-3 text-sm text-right bg-white border rounded-xl border-slate-200 text-slate-700 hover:border-indigo-300"
                                    >
                                        <span>{action.requiresApproval ? '🔐' : MODULES[action.module]?.icon}</span>
                                        <span className="font-semibold">{action.title}</span>
                                        <span className="mr-auto">
                                            <StatusBadge status={action.status} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {busy && (
                    <div className="flex justify-end">
                        <div className="px-4 py-3 text-sm rounded-2xl bg-slate-100 text-slate-500">🧠 חושב…</div>
                    </div>
                )}
                <div ref={bottom} />
            </div>
            <div className="p-3 border-t border-slate-100 sm:p-4">
                <div className="flex gap-2 pb-3 overflow-x-auto">
                    {SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion}
                            onClick={() => submit(suggestion)}
                            disabled={busy}
                            className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
                {error && <p className="p-2 mb-2 text-sm text-red-700 rounded-lg bg-red-50">{error}</p>}
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                    className="flex gap-2"
                >
                    <input
                        name="message"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="מה עושים עכשיו? אפשר לבקש מחקר, תוכן, מייל, פגישה…"
                        className="flex-1 px-4 py-3 border outline-none rounded-xl border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                        type="submit"
                        disabled={busy || !text.trim()}
                        className="px-5 font-bold text-white rounded-xl bg-gradient-to-l from-indigo-600 to-fuchsia-600 disabled:opacity-40"
                    >
                        שלח
                    </button>
                </form>
            </div>
        </div>
    );
}

// --- Plan & tasks ----------------------------------------------------------

function PlanPanel({ state, setTaskStatus }) {
    const { plan, tasks } = state;
    if (!plan) return null;
    return (
        <div className="space-y-4">
            <Card title="📋 התוכנית">
                <p className="leading-relaxed text-slate-700">{plan.summary}</p>
                <div className="p-3 mt-4 text-sm border rounded-xl bg-amber-50 border-amber-200 text-amber-900">
                    <b>הצעד הראשון:</b> {plan.firstStep}
                </div>
                {plan.risks?.length > 0 && (
                    <div className="mt-4">
                        <div className="text-sm font-bold text-slate-700">סיכונים לשים לב אליהם</div>
                        <ul className="mt-1 space-y-1 text-sm list-disc list-inside text-slate-600">
                            {plan.risks.map((risk) => (
                                <li key={risk}>{risk}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </Card>
            <ol className="relative space-y-4 border-r-2 border-indigo-100 pr-6">
                {plan.milestones.map((milestone, index) => {
                    const own = tasks.filter((task) => task.milestone === index);
                    const progress = progressOf(own);
                    return (
                        <li key={milestone.title} className="relative">
                            <span className="absolute -right-[35px] top-5 grid w-7 h-7 text-xs font-bold text-white rounded-full place-items-center bg-indigo-600 ring-4 ring-white">
                                {index + 1}
                            </span>
                            <Card
                                title={milestone.title}
                                action={<Badge>{milestone.weeks} שבועות</Badge>}
                            >
                                <p className="text-sm text-slate-600">{milestone.description}</p>
                                <div className="my-3">
                                    <ProgressBar percent={progress.percent} />
                                </div>
                                <TaskList tasks={own} setTaskStatus={setTaskStatus} />
                            </Card>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function TaskList({ tasks, setTaskStatus }) {
    return (
        <ul className="divide-y divide-slate-100">
            {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <input
                        type="checkbox"
                        aria-label={task.title}
                        checked={task.status === 'done'}
                        onChange={(event) => setTaskStatus(task.id, event.target.checked ? 'done' : 'todo')}
                        className="w-5 h-5 accent-indigo-600 shrink-0"
                    />
                    <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                    </span>
                    <ModuleTag id={task.module} />
                </li>
            ))}
        </ul>
    );
}

function TasksPanel({ state, setTaskStatus, addTasks }) {
    const [title, setTitle] = useState('');
    const open = state.tasks.filter((task) => task.status !== 'done');
    const done = state.tasks.filter((task) => task.status === 'done');
    return (
        <div className="space-y-4">
            <Card title={`✅ משימות פתוחות (${open.length})`}>
                <form
                    className="flex gap-2 mb-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (!title.trim()) return;
                        addTasks([{ title: title.trim(), module: 'planner' }]);
                        setTitle('');
                    }}
                >
                    <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="משימה חדשה…"
                        className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none border-slate-300 text-slate-900 focus:border-indigo-500"
                    />
                    <button className="px-4 text-sm font-bold text-white bg-indigo-600 rounded-lg">הוסף</button>
                </form>
                {open.length ? <TaskList tasks={open} setTaskStatus={setTaskStatus} /> : <p className="text-sm text-slate-500">הכול הושלם 🎉</p>}
            </Card>
            {done.length > 0 && (
                <Card title={`הושלמו (${done.length})`}>
                    <TaskList tasks={done} setTaskStatus={setTaskStatus} />
                </Card>
            )}
        </div>
    );
}

// --- Approvals -------------------------------------------------------------

function StatusBadge({ status }) {
    const map = {
        pending: ['ממתין לאישור', 'amber'],
        queued: ['בתור', 'slate'],
        approved: ['אושר', 'indigo'],
        running: ['מבצע…', 'indigo'],
        done: ['בוצע', 'green'],
        rejected: ['נדחה', 'red'],
        failed: ['נכשל', 'red']
    };
    const [label, tone] = map[status] ?? [status, 'slate'];
    return <Badge tone={tone}>{label}</Badge>;
}

const FIELD_LABELS = {
    to: 'נמען',
    subject: 'נושא',
    body: 'תוכן',
    title: 'כותרת',
    when: 'מועד',
    durationMinutes: 'משך (דקות)',
    description: 'תיאור',
    platform: 'רשת',
    text: 'טקסט',
    topic: 'נושא',
    kind: 'סוג'
};

function toLocalInput(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ApprovalCard({ action, decide }) {
    const [params, setParams] = useState(() =>
        Object.fromEntries(Object.entries(action.params ?? {}).filter(([, value]) => value !== null && value !== undefined))
    );
    const meta = ACTIONS[action.type];
    const pending = action.status === 'pending';

    function field(key) {
        const value = params[key] ?? '';
        const common =
            'w-full px-3 py-2 mt-1 text-sm border rounded-lg outline-none border-slate-300 text-slate-900 focus:border-indigo-500 disabled:bg-slate-50';
        if (key === 'body' || key === 'text' || key === 'description') {
            return <textarea rows={key === 'description' ? 2 : 5} disabled={!pending} value={value} onChange={(e) => setParams({ ...params, [key]: e.target.value })} className={common} />;
        }
        if (key === 'when') {
            return (
                <input
                    type="datetime-local"
                    disabled={!pending}
                    value={toLocalInput(value)}
                    onChange={(e) => setParams({ ...params, when: new Date(e.target.value).toISOString() })}
                    className={common}
                />
            );
        }
        return (
            <input
                dir={key === 'to' ? 'ltr' : undefined}
                disabled={!pending}
                value={value}
                onChange={(e) => setParams({ ...params, [key]: key === 'durationMinutes' ? Number(e.target.value) || '' : e.target.value })}
                className={common}
            />
        );
    }

    return (
        <div className={`p-5 bg-white border-2 rounded-2xl ${pending ? 'border-amber-300 shadow-lg shadow-amber-100' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl">🔐</span>
                <h4 className="font-bold text-slate-900">{action.title}</h4>
                <Badge tone={meta?.risk === 'high' ? 'red' : 'amber'}>סיכון {meta?.risk === 'high' ? 'גבוה' : 'בינוני'}</Badge>
                <span className="mr-auto">
                    <StatusBadge status={action.status} />
                </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{action.reason}</p>
            <div className="grid gap-3 mt-4 sm:grid-cols-2">
                {Object.keys(params).map((key) => (
                    <label key={key} className={`block ${['body', 'text', 'description'].includes(key) ? 'sm:col-span-2' : ''}`}>
                        <span className="text-xs font-semibold text-slate-500">{FIELD_LABELS[key] ?? key}</span>
                        {field(key)}
                    </label>
                ))}
            </div>
            {action.problems?.length > 0 && pending && (
                <p className="p-2 mt-3 text-xs rounded-lg text-amber-800 bg-amber-50">⚠️ {action.problems.join(' · ')}</p>
            )}
            {pending && (
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={() => decide(action.id, 'approved', params)}
                        className="flex-1 py-2.5 font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    >
                        ✓ מאשר/ת
                    </button>
                    <button
                        onClick={() => decide(action.id, 'rejected')}
                        className="flex-1 py-2.5 font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                        ✕ דחה
                    </button>
                </div>
            )}
            {action.error && <p className="p-2 mt-3 text-sm text-red-700 rounded-lg bg-red-50">{action.error}</p>}
            {action.result && <ResultView result={action.result} />}
        </div>
    );
}

function ResultView({ result }) {
    if (result.kind === 'document') {
        return (
            <div className="p-4 mt-4 border rounded-xl border-slate-200 bg-slate-50">
                <MarkdownToJsx className="text-sm leading-relaxed pilot-md text-slate-800">{result.content}</MarkdownToJsx>
            </div>
        );
    }
    const href =
        result.kind === 'file' ? `data:${result.mime};charset=utf-8,${encodeURIComponent(result.data)}` : result.href;
    return (
        <div className="p-4 mt-4 border rounded-xl border-emerald-200 bg-emerald-50">
            <div className="font-bold text-emerald-900">✅ {result.title}</div>
            <p className="mt-1 text-sm text-emerald-800">{result.note}</p>
            <a
                href={href}
                download={result.kind === 'file' ? result.filename : undefined}
                target={result.kind === 'handoff' && href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 mt-3 text-sm font-bold text-white no-underline rounded-lg bg-emerald-600"
            >
                {result.cta}
            </a>
        </div>
    );
}

function ApprovalsPanel({ state, decide }) {
    const external = state.actions.filter((action) => action.requiresApproval);
    const pending = external.filter((action) => action.status === 'pending');
    const history = external.filter((action) => action.status !== 'pending');
    return (
        <div className="space-y-4">
            <div className="p-4 text-sm border rounded-2xl border-indigo-200 bg-indigo-50 text-indigo-900">
                <b>🔐 כלל הברזל:</b> הסוכן מכין — את/ה מחליט/ה. כל פעולה שיוצאת מהאפליקציה (מייל, יומן, פרסום) מחכה כאן עד שתאשר/י,
                ואפשר לערוך אותה לפני האישור. גם אחרי אישור, השליחה עצמה נעשית מהחשבון שלך.
            </div>
            {pending.length === 0 && (
                <Card>
                    <p className="text-sm text-slate-500">אין פעולות שממתינות לאישור. בקש/י מהסוכן בצ׳אט לנסח מייל, לקבוע פגישה או לכתוב פוסט.</p>
                </Card>
            )}
            {pending.map((action) => (
                <ApprovalCard key={action.id} action={action} decide={decide} />
            ))}
            {history.length > 0 && (
                <>
                    <h3 className="pt-2 font-bold text-slate-700">היסטוריה</h3>
                    {history.map((action) => (
                        <ApprovalCard key={action.id} action={action} decide={decide} />
                    ))}
                </>
            )}
        </div>
    );
}

function OutputsPanel({ state }) {
    const outputs = state.actions.filter((action) => !action.requiresApproval);
    if (!outputs.length) {
        return (
            <Card title="🎨 תוצרים">
                <p className="text-sm text-slate-500">כאן יופיעו מחקרים (🔎) ותכנים (🎨) שהסוכן יצר. נסה/י בצ׳אט: "חקור את המתחרים".</p>
            </Card>
        );
    }
    return (
        <div className="space-y-4">
            {outputs.map((action) => (
                <Card
                    key={action.id}
                    title={`${MODULES[action.module]?.icon ?? '🎨'} ${action.result?.title ?? action.title}`}
                    action={<StatusBadge status={action.status} />}
                >
                    {action.status === 'running' && <p className="text-sm text-slate-500">הסוכן עובד על זה…</p>}
                    {action.error && <p className="text-sm text-red-700">{action.error}</p>}
                    {action.result && <ResultView result={action.result} />}
                </Card>
            ))}
        </div>
    );
}

// --- Memory & monitor ------------------------------------------------------

const MEMORY_CATEGORY = { goal: 'מטרה', preference: 'העדפה', fact: 'עובדה', constraint: 'מגבלה' };

function MemoryPanel({ state, addMemory, removeMemory }) {
    const [fact, setFact] = useState('');
    return (
        <Card title={`🧠 הזיכרון של הפרויקט (${state.memory.length})`}>
            <p className="mb-4 text-sm text-slate-500">
                מה שכתוב כאן נשלח לסוכן בכל שיחה — כך הוא לא שוכח את ההקשר. אפשר להוסיף ולמחוק.
            </p>
            <form
                className="flex gap-2 mb-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!fact.trim()) return;
                    addMemory([{ fact: fact.trim(), category: 'fact' }], 'manual');
                    setFact('');
                }}
            >
                <input
                    value={fact}
                    onChange={(event) => setFact(event.target.value)}
                    placeholder="משהו שהסוכן צריך לזכור…"
                    className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none border-slate-300 text-slate-900 focus:border-indigo-500"
                />
                <button className="px-4 text-sm font-bold text-white bg-indigo-600 rounded-lg">שמור</button>
            </form>
            <ul className="space-y-2">
                {state.memory.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                        <Badge tone={item.category === 'goal' ? 'indigo' : 'slate'}>{MEMORY_CATEGORY[item.category] ?? item.category}</Badge>
                        <span className="flex-1 text-sm text-slate-800">{item.fact}</span>
                        <button onClick={() => removeMemory(item.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label="מחק">
                            ✕
                        </button>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function timeAgo(iso) {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} ד׳`;
    const hours = Math.round(minutes / 60);
    return hours < 24 ? `לפני ${hours} ש׳` : new Date(iso).toLocaleDateString('he-IL');
}

function MonitorPanel({ state }) {
    const progress = progressOf(state.tasks);
    const pending = state.actions.filter((action) => action.status === 'pending').length;
    const executed = state.actions.filter((action) => action.status === 'done').length;
    const byModule = Object.values(MODULES)
        .map((module) => ({ ...module, count: state.tasks.filter((task) => task.module === module.id).length }))
        .filter((module) => module.count);
    const max = Math.max(1, ...byModule.map((module) => module.count));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    ['התקדמות', `${progress.percent}%`],
                    ['משימות שהושלמו', `${progress.done}/${progress.total}`],
                    ['ממתינות לאישור', pending],
                    ['פעולות שבוצעו', executed]
                ].map(([label, value]) => (
                    <div key={label} className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
                        <div className="text-xs font-semibold text-slate-500">{label}</div>
                        <div className="mt-1 text-3xl font-extrabold text-slate-900 tabular-nums">{value}</div>
                    </div>
                ))}
            </div>
            <Card title="📊 התקדמות לפי אבני דרך">
                <div className="space-y-3">
                    {state.plan?.milestones.map((milestone, index) => {
                        const own = progressOf(state.tasks.filter((task) => task.milestone === index));
                        return (
                            <div key={milestone.title}>
                                <div className="flex justify-between mb-1 text-sm">
                                    <span className="font-semibold text-slate-700">{milestone.title}</span>
                                    <span className="tabular-nums text-slate-500">{own.percent}%</span>
                                </div>
                                <ProgressBar percent={own.percent} />
                            </div>
                        );
                    })}
                </div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="עבודה לפי מודול">
                    <div className="space-y-2">
                        {byModule.map((module) => (
                            <div key={module.id} className="flex items-center gap-2 text-sm">
                                <span className="w-28 shrink-0 text-slate-700">
                                    {module.icon} {module.label}
                                </span>
                                <div className="flex-1 h-5 rounded bg-slate-50">
                                    <div className="h-full bg-indigo-400 rounded" style={{ width: `${(module.count / max) * 100}%` }} />
                                </div>
                                <span className="w-6 text-left tabular-nums text-slate-500">{module.count}</span>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card title="יומן פעילות">
                    <ul className="space-y-2 overflow-y-auto max-h-72">
                        {state.activity.slice(0, 30).map((entry) => (
                            <li key={entry.id} className="flex items-start gap-2 text-sm">
                                <span>{MODULES[entry.module]?.icon ?? '•'}</span>
                                <span className="flex-1 text-slate-700">{entry.text}</span>
                                <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(entry.at)}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </div>
    );
}

// --- Shell -----------------------------------------------------------------

export function Workspace({ app, initialTab = 'chat' }) {
    const { state, mode } = app;
    const [tab, setTab] = useState(initialTab);
    const progress = progressOf(state.tasks);
    const pending = state.actions.filter((action) => action.status === 'pending').length;

    const panels = {
        chat: <ChatPanel state={state} send={app.send} onOpenApprovals={() => setTab('approvals')} />,
        plan: <PlanPanel state={state} setTaskStatus={app.setTaskStatus} />,
        tasks: <TasksPanel state={state} setTaskStatus={app.setTaskStatus} addTasks={app.addTasks} />,
        approvals: <ApprovalsPanel state={state} decide={app.decide} />,
        outputs: <OutputsPanel state={state} />,
        memory: <MemoryPanel state={state} addMemory={app.addMemory} removeMemory={app.removeMemory} />,
        monitor: <MonitorPanel state={state} />
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
                <div className="flex items-center gap-4 px-4 py-3 mx-auto max-w-7xl sm:px-6">
                    <Logo />
                    <div className="flex-1 hidden min-w-0 md:block">
                        <div className="text-xs font-semibold text-slate-500">המטרה</div>
                        <div className="text-sm font-bold truncate text-slate-900">{state.project.goal}</div>
                    </div>
                    <div className="hidden w-40 sm:block">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>התקדמות</span>
                            <span className="tabular-nums">{progress.percent}%</span>
                        </div>
                        <div className="mt-1">
                            <ProgressBar percent={progress.percent} />
                        </div>
                    </div>
                    <Badge tone={mode === 'claude' ? 'green' : 'amber'}>{mode === 'claude' ? '● Claude מחובר' : '● מצב הדגמה'}</Badge>
                    <div className="grid w-9 h-9 text-sm font-bold text-white rounded-full place-items-center bg-slate-800" title={state.user.email}>
                        {state.user.name.slice(0, 1)}
                    </div>
                </div>
            </header>

            <div className="grid gap-6 px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:grid-cols-[220px_1fr]">
                <nav className="flex gap-1 pb-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                    {TABS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition ${
                                tab === item.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-700 hover:bg-white'
                            }`}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                            {item.id === 'approvals' && pending > 0 && (
                                <span className="px-1.5 mr-auto text-[11px] font-bold rounded-full bg-amber-400 text-amber-950">{pending}</span>
                            )}
                        </button>
                    ))}
                    <div className="hidden pt-6 mt-6 space-y-1 border-t lg:block border-slate-200">
                        <button onClick={app.restartProject} className="w-full px-3 py-2 text-xs text-right rounded-lg text-slate-500 hover:bg-white">
                            ↺ מטרה חדשה
                        </button>
                        <button onClick={app.reset} className="w-full px-3 py-2 text-xs text-right rounded-lg text-slate-400 hover:bg-white">
                            התנתק ומחק נתונים
                        </button>
                    </div>
                </nav>
                <main className="min-w-0">{panels[tab]}</main>
            </div>
        </div>
    );
}
