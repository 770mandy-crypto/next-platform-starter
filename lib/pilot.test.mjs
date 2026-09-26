// Offline checks for Maslul: the approval policy (the part that must never
// regress), the demo-mode brain, and the hand-off builders. No Claude call is
// made here — demo mode is exactly what runs without a key.
import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIONS, checkExecutable, progressOf, requiresApproval, validateParams } from './pilot/policy.js';
import { fallbackChat, fallbackPlan, guessWhen, pickTemplate } from './pilot/fallback.js';
import { buildIcs, buildMailto, buildShareUrl } from './pilot/handoff.js';

// --- Approval policy -------------------------------------------------------

test('every external action requires approval and internal ones do not', () => {
    for (const action of Object.values(ACTIONS)) {
        assert.equal(requiresApproval(action.type), action.external, action.type);
    }
    assert.equal(requiresApproval('send_email'), true);
    assert.equal(requiresApproval('research_topic'), false);
});

test('an unknown action type is treated as needing approval, and cannot run', () => {
    assert.equal(requiresApproval('delete_everything'), true);
    assert.match(checkExecutable({ type: 'delete_everything', approval: { decision: 'approved', at: 'now' } }), /לא מוכר/);
    assert.ok(checkExecutable(null));
});

test('an external action without an explicit approval is blocked', () => {
    const email = { type: 'send_email', params: {} };
    assert.ok(checkExecutable(email));
    assert.ok(checkExecutable({ ...email, approval: { decision: 'rejected', at: '2026-01-01' } }));
    assert.ok(checkExecutable({ ...email, approval: { decision: 'approved' } }), 'approval needs a timestamp');
    assert.equal(checkExecutable({ ...email, approval: { decision: 'approved', at: '2026-01-01' } }), null);
});

test('internal actions run without approval', () => {
    assert.equal(checkExecutable({ type: 'research_topic', params: { topic: 'x' } }), null);
    assert.equal(checkExecutable({ type: 'create_content', params: { topic: 'x' } }), null);
});

test('validateParams catches malformed proposals before the user approves them', () => {
    assert.deepEqual(validateParams('send_email', { to: 'a@b.co', subject: 's', body: 'b' }), []);
    assert.equal(validateParams('send_email', { to: 'not-an-email', subject: 's', body: 'b' }).length, 1);
    assert.equal(validateParams('schedule_event', { title: 't', when: 'garbage' }).length, 1);
    assert.equal(validateParams('publish_post', {}).length, 1);
});

test('progressOf handles an empty list and rounds', () => {
    assert.deepEqual(progressOf([]), { done: 0, total: 0, percent: 0 });
    assert.equal(progressOf([{ status: 'done' }, { status: 'todo' }, { status: 'todo' }]).percent, 33);
});

// --- Demo brain ------------------------------------------------------------

test('fallbackPlan picks a template by goal and fills every milestone', () => {
    assert.equal(pickTemplate('להשיק סטארט-אפ').id, 'business');
    assert.equal(pickTemplate('ללמוד ספרדית').id, 'learning');
    assert.equal(pickTemplate('למצוא עבודה').id, 'career');
    assert.equal(pickTemplate('לרוץ מרתון').id, 'generic');

    const plan = fallbackPlan({ goal: 'להשיק חנות', weeks: 6 });
    assert.ok(plan.summary.includes('להשיק חנות'));
    assert.ok(plan.milestones.length >= 3);
    for (const milestone of plan.milestones) assert.ok(milestone.tasks.length > 0);
});

test('fallbackChat proposes the right actions and never marks them executed', () => {
    const result = fallbackChat({ message: 'תנסח מייל ל-dana@example.com ותקבע פגישה מחר ב-14:30', project: { goal: 'X' } });
    const types = result.actions.map((action) => action.type);
    assert.ok(types.includes('send_email'));
    assert.ok(types.includes('schedule_event'));
    assert.equal(result.actions.find((a) => a.type === 'send_email').params.to, 'dana@example.com');
    assert.match(result.reply, /אישור/);
    for (const action of result.actions) assert.equal(action.status, undefined);
});

test('fallbackChat recognises Hebrew inflections of a meeting request', () => {
    for (const message of ['קבע לי פגישת עבודה מחר ב-10:00', 'תקבע פגישה', 'תוסיף ליומן']) {
        const types = fallbackChat({ message, project: null }).actions.map((action) => action.type);
        assert.ok(types.includes('schedule_event'), message);
    }
});

test('fallbackChat remembers facts the user asks it to keep', () => {
    const result = fallbackChat({ message: 'תזכור: התקציב שלי הוא 5,000 ₪', project: null });
    assert.equal(result.memory[0].fact, 'התקציב שלי הוא 5,000 ₪');
    assert.equal(result.actions.length, 0);
});

test('guessWhen reads a clock time and defaults to tomorrow', () => {
    const now = new Date('2026-09-26T08:00:00');
    const when = new Date(guessWhen('מחר ב-14:30', now));
    assert.equal(when.getDate(), 27);
    assert.equal(when.getHours(), 14);
    assert.equal(when.getMinutes(), 30);
});

// --- Hand-offs -------------------------------------------------------------

test('buildIcs produces a valid, escaped VEVENT', () => {
    const ics = buildIcs(
        { title: 'פגישה, חשובה; מאוד', when: '2026-10-01T10:00:00Z', durationMinutes: 45 },
        new Date('2026-09-26T00:00:00Z')
    );
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /DTSTART:20261001T100000Z/);
    assert.match(ics, /DTEND:20261001T104500Z/);
    assert.match(ics, /SUMMARY:פגישה\\, חשובה\\; מאוד/);
});

test('buildMailto and buildShareUrl encode their text', () => {
    const mailto = buildMailto({ to: 'a@b.co', subject: 'שלום עולם', body: 'שורה\nשנייה' });
    assert.ok(mailto.startsWith('mailto:a@b.co?'));
    assert.ok(!mailto.includes('+'));
    assert.ok(buildShareUrl({ platform: 'x', text: 'hi there' }).startsWith('https://twitter.com/intent/tweet?text=hi%20there'));
    assert.ok(buildShareUrl({ text: 'x' }).startsWith('https://www.linkedin.com/'));
});
