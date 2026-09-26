// What the Maslul agent is allowed to do, and which of those things need the
// user's approval first. This file is the single source of truth for both the
// server (which refuses an unapproved external action) and the UI (which shows
// the approval card), so the two can never disagree.

export const MODULES = {
    brain: { id: 'brain', icon: '🧠', label: 'Brain', he: 'זוכר את ההקשר' },
    research: { id: 'research', icon: '🔎', label: 'Research', he: 'חוקר' },
    planner: { id: 'planner', icon: '📋', label: 'Planner', he: 'מתכנן' },
    agents: { id: 'agents', icon: '🤖', label: 'Agents', he: 'מבצע משימות' },
    creator: { id: 'creator', icon: '🎨', label: 'Creator', he: 'יוצר תוכן' },
    monitor: { id: 'monitor', icon: '📊', label: 'Monitor', he: 'עוקב אחרי ההתקדמות' },
    approval: { id: 'approval', icon: '🔐', label: 'Approval', he: 'מבקש אישור לפני פעולות חשובות' }
};

export const MODULE_IDS = Object.keys(MODULES);

// `external` means the action leaves the app and touches the real world (a
// person's inbox, a calendar, a public feed). Every external action waits for
// an explicit approval. Internal actions only produce text inside the app.
export const ACTIONS = {
    research_topic: {
        type: 'research_topic',
        module: 'research',
        label: 'מחקר נושא',
        external: false,
        risk: 'low'
    },
    create_content: {
        type: 'create_content',
        module: 'creator',
        label: 'יצירת תוכן',
        external: false,
        risk: 'low'
    },
    send_email: {
        type: 'send_email',
        module: 'agents',
        label: 'שליחת מייל',
        external: true,
        risk: 'high'
    },
    schedule_event: {
        type: 'schedule_event',
        module: 'agents',
        label: 'קביעת אירוע ביומן',
        external: true,
        risk: 'medium'
    },
    publish_post: {
        type: 'publish_post',
        module: 'agents',
        label: 'פרסום פוסט',
        external: true,
        risk: 'high'
    }
};

export const ACTION_TYPES = Object.keys(ACTIONS);

export function requiresApproval(type) {
    const action = ACTIONS[type];
    // An unknown action type is treated as the riskiest kind, never as free.
    return action ? action.external : true;
}

// Returns null when the action may run, or a Hebrew reason when it may not.
export function checkExecutable(action) {
    if (!action || !ACTIONS[action.type]) return 'סוג פעולה לא מוכר — הסוכן מורשה רק לפעולות מהרשימה המוגדרת.';
    if (!requiresApproval(action.type)) return null;

    const approval = action.approval;
    if (!approval || approval.decision !== 'approved' || !approval.at) {
        return 'פעולה חיצונית דורשת אישור מפורש של המשתמש לפני ביצוע.';
    }
    return null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Light validation of what the agent proposed, so a malformed proposal is
// caught on the approval card instead of failing after the user said yes.
export function validateParams(type, params = {}) {
    const problems = [];
    if (type === 'send_email') {
        if (params.to && !EMAIL_PATTERN.test(params.to)) problems.push('כתובת המייל אינה תקינה');
        if (!params.subject) problems.push('חסר נושא למייל');
        if (!params.body) problems.push('חסר תוכן למייל');
    }
    if (type === 'schedule_event') {
        if (!params.title) problems.push('חסרה כותרת לאירוע');
        if (!params.when || Number.isNaN(Date.parse(params.when))) problems.push('חסר מועד תקין לאירוע');
    }
    if (type === 'publish_post' && !params.text) problems.push('חסר טקסט לפוסט');
    if ((type === 'research_topic' || type === 'create_content') && !params.topic) problems.push('חסר נושא');
    return problems;
}

export function progressOf(tasks = []) {
    if (!tasks.length) return { done: 0, total: 0, percent: 0 };
    const done = tasks.filter((task) => task.status === 'done').length;
    return { done, total: tasks.length, percent: Math.round((done / tasks.length) * 100) };
}
