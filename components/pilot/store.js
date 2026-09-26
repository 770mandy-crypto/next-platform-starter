'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MODULES } from 'lib/pilot/policy';

// The MVP keeps each user's workspace in their own browser. Moving this to a
// database is the first step of the roadmap; the shape below is what gets
// persisted there, so nothing else has to change.
const STORAGE_KEY = 'maslul:v1';

export const EMPTY_STATE = {
    user: null,
    project: null,
    plan: null,
    tasks: [],
    memory: [],
    messages: [],
    actions: [],
    activity: []
};

let counter = 0;
export function newId(prefix) {
    counter += 1;
    return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

function load() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
    } catch {
        return EMPTY_STATE;
    }
}

async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `שגיאה ${response.status}`);
    return data;
}

function logEntry(module, text) {
    return { id: newId('log'), module, text, at: new Date().toISOString() };
}

export function useMaslul() {
    const [state, setState] = useState(EMPTY_STATE);
    const [ready, setReady] = useState(false);
    const [mode, setMode] = useState(null);
    const stateRef = useRef(state);
    stateRef.current = state;

    useEffect(() => {
        setState(load());
        setReady(true);
        fetch('/api/pilot/status')
            .then((response) => response.json())
            .then((data) => setMode(data.mode))
            .catch(() => setMode('demo'));
    }, []);

    useEffect(() => {
        if (!ready) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch {
            // Private windows can refuse storage; the session still works in memory.
        }
    }, [state, ready]);

    const update = useCallback((recipe) => setState((current) => ({ ...current, ...recipe(current) })), []);

    const log = useCallback(
        (module, text) => update((current) => ({ activity: [logEntry(module, text), ...current.activity].slice(0, 200) })),
        [update]
    );

    const signUp = useCallback(
        (user) =>
            update(() => ({
                user: { ...user, id: newId('user'), createdAt: new Date().toISOString() },
                activity: [logEntry('brain', `ברוך/ה הבא/ה, ${user.name}! החשבון נוצר.`)]
            })),
        [update]
    );

    const addMemory = useCallback(
        (facts, source = 'chat') =>
            update((current) => {
                const known = new Set(current.memory.map((item) => item.fact));
                const fresh = facts
                    .filter((item) => item?.fact && !known.has(item.fact))
                    .map((item) => ({
                        id: newId('mem'),
                        fact: item.fact,
                        category: item.category || 'fact',
                        source,
                        at: new Date().toISOString()
                    }));
                if (!fresh.length) return {};
                return {
                    memory: [...current.memory, ...fresh],
                    activity: [
                        ...fresh.map((item) => logEntry('brain', `נשמר בזיכרון: ${item.fact}`)),
                        ...current.activity
                    ]
                };
            }),
        [update]
    );

    const addTasks = useCallback(
        (tasks, extra = {}) =>
            update((current) => {
                const fresh = tasks.map((task) => ({
                    id: newId('task'),
                    title: task.title,
                    detail: task.detail || '',
                    module: MODULES[task.module] ? task.module : 'planner',
                    status: 'todo',
                    createdAt: new Date().toISOString(),
                    ...extra
                }));
                return {
                    tasks: [...current.tasks, ...fresh],
                    activity: fresh.length
                        ? [logEntry('planner', `נוספו ${fresh.length} משימות`), ...current.activity]
                        : current.activity
                };
            }),
        [update]
    );

    const createProject = useCallback(
        async ({ goal, context, weeks }) => {
            const plan = await postJson('/api/pilot/plan', { goal, context, weeks });
            update((current) => {
                const tasks = plan.milestones.flatMap((milestone, index) =>
                    milestone.tasks.map((task) => ({
                        id: newId('task'),
                        title: task.title,
                        detail: task.detail || '',
                        module: MODULES[task.module] ? task.module : 'planner',
                        milestone: index,
                        status: 'todo',
                        createdAt: new Date().toISOString()
                    }))
                );
                return {
                    project: { goal, context, weeks, nextStep: plan.firstStep, createdAt: new Date().toISOString() },
                    plan,
                    tasks,
                    memory: [
                        { id: newId('mem'), fact: `המטרה: ${goal}`, category: 'goal', source: 'onboarding', at: new Date().toISOString() },
                        ...(context
                            ? [{ id: newId('mem'), fact: context, category: 'fact', source: 'onboarding', at: new Date().toISOString() }]
                            : []),
                        ...current.memory
                    ],
                    messages: [
                        {
                            id: newId('msg'),
                            role: 'assistant',
                            content: `בניתי לך תוכנית של ${plan.milestones.length} אבני דרך ו-${tasks.length} משימות. ${plan.summary}\n\nהצעד הראשון: ${plan.firstStep}`
                        }
                    ],
                    activity: [
                        logEntry('planner', `נוצרה תוכנית: ${plan.milestones.length} אבני דרך, ${tasks.length} משימות`),
                        logEntry('brain', 'המטרה וההקשר נשמרו בזיכרון הפרויקט'),
                        ...current.activity
                    ]
                };
            });
            return plan;
        },
        [update]
    );

    const setTaskStatus = useCallback(
        (id, status) =>
            update((current) => {
                const task = current.tasks.find((item) => item.id === id);
                return {
                    tasks: current.tasks.map((item) => (item.id === id ? { ...item, status } : item)),
                    activity:
                        task && status === 'done'
                            ? [logEntry('monitor', `הושלמה משימה: ${task.title}`), ...current.activity]
                            : current.activity
                };
            }),
        [update]
    );

    const removeMemory = useCallback(
        (id) => update((current) => ({ memory: current.memory.filter((item) => item.id !== id) })),
        [update]
    );

    const patchAction = useCallback(
        (id, patch) =>
            update((current) => ({
                actions: current.actions.map((action) => (action.id === id ? { ...action, ...patch } : action))
            })),
        [update]
    );

    const execute = useCallback(
        async (action) => {
            patchAction(action.id, { status: 'running' });
            try {
                const { project, memory } = stateRef.current;
                const result = await postJson('/api/pilot/execute', { action, project, memory });
                patchAction(action.id, { status: 'done', result, finishedAt: new Date().toISOString() });
                log(action.requiresApproval ? 'agents' : MODULES[action.module] ? action.module : 'agents', `בוצע: ${action.title}`);
            } catch (error) {
                patchAction(action.id, { status: 'failed', error: error.message });
                log('agents', `נכשל: ${action.title} — ${error.message}`);
            }
        },
        [patchAction, log]
    );

    const decide = useCallback(
        (id, decision, editedParams) => {
            const action = stateRef.current.actions.find((item) => item.id === id);
            if (!action) return;
            const approval = { decision, at: new Date().toISOString(), by: stateRef.current.user?.email ?? 'user' };
            const next = { ...action, params: editedParams ?? action.params, approval };
            if (decision === 'approved') {
                patchAction(id, { params: next.params, approval, status: 'approved' });
                log('approval', `אושר: ${action.title}`);
                execute(next);
            } else {
                patchAction(id, { approval, status: 'rejected' });
                log('approval', `נדחה: ${action.title}`);
            }
        },
        [patchAction, log, execute]
    );

    const send = useCallback(
        async (text) => {
            const current = stateRef.current;
            const userMessage = { id: newId('msg'), role: 'user', content: text };
            update((s) => ({ messages: [...s.messages, userMessage] }));

            const result = await postJson('/api/pilot/chat', {
                message: text,
                history: current.messages,
                project: current.project,
                memory: current.memory,
                tasks: current.tasks
            });

            const actions = (result.actions ?? []).map((action) => ({
                ...action,
                id: newId('act'),
                module: action.requiresApproval ? 'agents' : action.type === 'research_topic' ? 'research' : 'creator',
                status: action.requiresApproval ? 'pending' : 'queued',
                createdAt: new Date().toISOString()
            }));

            update((s) => ({
                messages: [
                    ...s.messages,
                    {
                        id: newId('msg'),
                        role: 'assistant',
                        content: result.reply,
                        source: result.source,
                        actionIds: actions.map((action) => action.id)
                    }
                ],
                actions: [...actions, ...s.actions],
                activity: [
                    ...actions
                        .filter((action) => action.requiresApproval)
                        .map((action) => logEntry('approval', `ממתין לאישור: ${action.title}`)),
                    ...s.activity
                ]
            }));
            if (result.memory?.length) addMemory(result.memory);
            if (result.tasks?.length) addTasks(result.tasks);

            // Internal actions only write text inside the app, so they run at once.
            for (const action of actions.filter((item) => !item.requiresApproval)) execute(action);
            return result;
        },
        [update, addMemory, addTasks, execute]
    );

    const reset = useCallback(() => {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {}
        setState(EMPTY_STATE);
    }, []);

    const restartProject = useCallback(
        () => update(() => ({ project: null, plan: null, tasks: [], messages: [], actions: [] })),
        [update]
    );

    return {
        state,
        ready,
        mode,
        signUp,
        createProject,
        send,
        decide,
        setTaskStatus,
        addTasks,
        addMemory,
        removeMemory,
        reset,
        restartProject
    };
}
