'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MODULES } from 'lib/pilot/policy';

// The workspace lives on the server, per account (see lib/pilot/workspace.js).
// This hook loads it after sign-in and saves every change back, debounced.
// `maslul:v1` is where the first, browser-only version kept it; anything found
// there is offered to the server once, at sign-up, and then removed.
const LEGACY_STORAGE_KEY = 'maslul:v1';
const SAVE_DELAY_MS = 700;

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

function readLegacyWorkspace() {
    try {
        const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : null;
        return data?.project ? data : null;
    } catch {
        return null;
    }
}

function clearLegacyWorkspace() {
    try {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
}

export class SessionExpiredError extends Error {}

async function request(url, { method = 'GET', body } = {}) {
    const response = await fetch(url, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && !url.includes('/auth/')) throw new SessionExpiredError(data.error);
    if (!response.ok) throw new Error(data.error || `שגיאה ${response.status}`);
    return data;
}

const postJson = (url, body) => request(url, { method: 'POST', body });

function logEntry(module, text) {
    return { id: newId('log'), module, text, at: new Date().toISOString() };
}

function workspaceOf(state) {
    const { user, ...workspace } = state;
    return workspace;
}

export function useMaslul() {
    const [state, setState] = useState(EMPTY_STATE);
    const [ready, setReady] = useState(false);
    const [mode, setMode] = useState(null);
    const [saveStatus, setSaveStatus] = useState('saved');
    const stateRef = useRef(state);
    stateRef.current = state;
    // Changes made before the workspace finished loading must not be saved
    // over it, so saving only starts once a load (or sign-up) has completed.
    const loadedFor = useRef(null);
    const saveTimer = useRef(null);

    const applySession = useCallback(async (user) => {
        if (!user) {
            loadedFor.current = null;
            setState(EMPTY_STATE);
            return;
        }
        const { workspace } = await request('/api/pilot/workspace');
        setState({ ...EMPTY_STATE, ...(workspace ?? {}), user });
        loadedFor.current = user.id;
    }, []);

    useEffect(() => {
        request('/api/pilot/auth/me')
            .then(({ user }) => applySession(user))
            .catch(() => applySession(null))
            .finally(() => setReady(true));
        fetch('/api/pilot/status')
            .then((response) => response.json())
            .then((data) => setMode(data.mode))
            .catch(() => setMode('demo'));
    }, [applySession]);

    const handleExpired = useCallback((error) => {
        if (error instanceof SessionExpiredError) {
            loadedFor.current = null;
            setState(EMPTY_STATE);
        }
        throw error;
    }, []);

    useEffect(() => {
        if (!ready || !state.user || loadedFor.current !== state.user.id) return;
        setSaveStatus('saving');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            request('/api/pilot/workspace', { method: 'PUT', body: { workspace: workspaceOf(stateRef.current) } })
                .then(() => setSaveStatus('saved'))
                .catch((error) => {
                    setSaveStatus('error');
                    if (error instanceof SessionExpiredError) handleExpired(error);
                });
        }, SAVE_DELAY_MS);
        return () => clearTimeout(saveTimer.current);
    }, [state, ready, handleExpired]);

    const update = useCallback((recipe) => setState((current) => ({ ...current, ...recipe(current) })), []);

    const log = useCallback(
        (module, text) => update((current) => ({ activity: [logEntry(module, text), ...current.activity].slice(0, 200) })),
        [update]
    );

    const signUp = useCallback(
        async ({ name, email, password }) => {
            const legacy = readLegacyWorkspace();
            const importWorkspace = legacy ? workspaceOf(legacy) : null;
            const { user } = await postJson('/api/pilot/auth/signup', { name, email, password, importWorkspace });
            clearLegacyWorkspace();
            const base = importWorkspace ? { ...EMPTY_STATE, ...importWorkspace } : EMPTY_STATE;
            setState({
                ...base,
                user,
                activity: [logEntry('brain', `ברוך/ה הבא/ה, ${user.name}! החשבון נוצר.`), ...base.activity]
            });
            loadedFor.current = user.id;
        },
        []
    );

    const logIn = useCallback(
        async ({ email, password }) => {
            const { user } = await postJson('/api/pilot/auth/login', { email, password });
            await applySession(user);
        },
        [applySession]
    );

    const logOut = useCallback(async () => {
        clearTimeout(saveTimer.current);
        // Flush the latest state before the session goes away.
        if (stateRef.current.user && loadedFor.current === stateRef.current.user.id) {
            await request('/api/pilot/workspace', { method: 'PUT', body: { workspace: workspaceOf(stateRef.current) } }).catch(() => {});
        }
        await postJson('/api/pilot/auth/logout', {}).catch(() => {});
        loadedFor.current = null;
        setState(EMPTY_STATE);
    }, []);

    const deleteAccount = useCallback(async () => {
        clearTimeout(saveTimer.current);
        loadedFor.current = null;
        await request('/api/pilot/auth/me', { method: 'DELETE' });
        clearLegacyWorkspace();
        setState(EMPTY_STATE);
    }, []);

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
            const plan = await postJson('/api/pilot/plan', { goal, context, weeks }).catch(handleExpired);
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
        [update, handleExpired]
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
                postJson('/api/pilot/audit', { event: 'rejected', type: action.type, actionId: action.id, title: action.title }).catch(
                    () => {}
                );
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
            }).catch(handleExpired);

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
        [update, addMemory, addTasks, execute, handleExpired]
    );

    const restartProject = useCallback(
        () => update(() => ({ project: null, plan: null, tasks: [], messages: [], actions: [] })),
        [update]
    );

    return {
        state,
        ready,
        mode,
        saveStatus,
        signUp,
        logIn,
        logOut,
        deleteAccount,
        createProject,
        send,
        decide,
        setTaskStatus,
        addTasks,
        addMemory,
        removeMemory,
        restartProject
    };
}
