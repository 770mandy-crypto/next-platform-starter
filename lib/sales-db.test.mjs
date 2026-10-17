// Integration tests against a real PostgreSQL database. They run only when
// SALES_TEST_DATABASE_URL points at a database that may be wiped, e.g.
//   SALES_TEST_DATABASE_URL=postgres://sales:sales@localhost/sales_test npm test
// The model is replaced by a scripted fake client; everything else — SQL,
// row-level security, tools, guardrails, outbound rules — is the real code.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

const url = process.env.SALES_TEST_DATABASE_URL;

describe('sales agent with PostgreSQL', { skip: !url && 'SALES_TEST_DATABASE_URL is not set' }, () => {
    let m; // modules, imported after DATABASE_URL is set
    let owner;
    let biz;
    let other;

    before(async () => {
        process.env.DATABASE_URL = url;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_AUTH_TOKEN;
        delete process.env.TWILIO_ACCOUNT_SID;
        const db = await import('./sales/db.js');
        await db.getPool().query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        await db.migrate();
        m = {
            db,
            auth: await import('./sales/auth.js'),
            business: await import('./sales/business.js'),
            calls: await import('./sales/calls.js'),
            leads: await import('./sales/leads.js'),
            outbound: await import('./sales/outbound.js'),
            metrics: await import('./sales/metrics.js'),
            maintenance: await import('./sales/maintenance.js'),
            example: await import('./sales/example.js'),
            qa: await import('./sales/qa.js')
        };
        owner = await m.auth.createUser({ name: 'Owner', email: 'owner@example.com', password: 'correct horse', ip: 't' });
        biz = await m.business.createBusiness(owner.id, {
            ...m.example.EXAMPLE_BUSINESS,
            inbound_number: '+972722222222',
            outbound_enabled: true,
            // Open every day so tests do not depend on the weekday they run.
            business_hours: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [{ start: '00:00', end: '23:59' }]])),
            calling_window: { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] }
        });
        await m.db.withTenant(biz.id, async (db) => {
            for (const item of m.example.EXAMPLE_KNOWLEDGE) await m.business.createKnowledge(db, biz.id, item, owner.id);
        });
        const otherUser = await m.auth.createUser({ name: 'B', email: 'b@example.com', password: 'another pass', ip: 't' });
        other = await m.business.createBusiness(otherUser.id, { name: 'Other business' });
    });

    after(async () => {
        await m?.db.closePool();
    });

    // A stand-in for the Anthropic client: each create() returns the next
    // scripted response (or calls it with the request).
    function fakeClient(script, review = {}) {
        const requests = [];
        return {
            requests,
            beta: {
                messages: {
                    async create(params) {
                        requests.push(structuredClone(params));
                        const next = script.shift();
                        if (!next) throw new Error('fake client: script exhausted');
                        return typeof next === 'function' ? next(params) : next;
                    },
                    async parse() {
                        return {
                            parsed_output: {
                                summary: 'סיכום בדיקה',
                                outcome: 'info_only',
                                sentiment: 'neutral',
                                quality_score: 4,
                                quality_notes: '',
                                complaint: false,
                                ...review
                            },
                            usage: { input_tokens: 500, output_tokens: 50 }
                        };
                    }
                }
            }
        };
    }
    const say = (text) => ({
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 1000, output_tokens: 40 }
    });
    const use = (name, input, id = `tu_${name}`) => ({
        content: [{ type: 'tool_use', id, name, input }],
        stop_reason: 'tool_use',
        usage: { input_tokens: 1000, output_tokens: 30 }
    });
    const lastToolResult = (params) => {
        const last = params.messages.at(-1);
        return JSON.parse(last.content.find((b) => b.type === 'tool_result').content);
    };

    test('passwords and sessions', async () => {
        await assert.rejects(m.auth.authenticate({ email: 'owner@example.com', password: 'wrong', ip: 't' }), {
            status: 401
        });
        const user = await m.auth.authenticate({ email: 'OWNER@example.com', password: 'correct horse', ip: 't' });
        const token = await m.auth.createSession(user.id);
        assert.equal((await m.auth.getSessionUser(token)).email, 'owner@example.com');
        assert.equal((await m.auth.membershipsOf(user.id))[0].role, 'owner');
        await m.auth.destroySession(token);
        assert.equal(await m.auth.getSessionUser(token), null);
        await assert.rejects(m.auth.createUser({ name: 'X', email: 'owner@example.com', password: '12345678' }), {
            status: 409
        });
    });

    test('row-level security hides other businesses even without a WHERE clause', async () => {
        await m.db.withTenant(other.id, (db) =>
            m.leads.upsertLead(db, { id: other.id, country: 'IL' }, { phone: '0501111111', name: 'Secret' })
        );
        const seen = await m.db.withTenant(biz.id, async (db) => (await db.query('SELECT name FROM leads')).rows);
        assert.ok(!seen.some((l) => l.name === 'Secret'));
        const businesses = await m.db.withTenant(biz.id, async (db) => (await db.query('SELECT id FROM businesses')).rows);
        assert.deepEqual(businesses.map((b) => b.id), [biz.id]);
        // Writing a row for another tenant is refused by the policy.
        await assert.rejects(
            m.db.withTenant(biz.id, (db) =>
                db.query("INSERT INTO leads (business_id, phone) VALUES ($1, '+972509999999')", [other.id])
            ),
            /row-level security/
        );
    });

    test('only active, verified knowledge reaches the agent', async () => {
        const items = await m.db.withTenant(biz.id, (db) => m.business.agentKnowledge(db, biz.id));
        assert.ok(items.some((k) => k.title === 'טיפול פיזיותרפיה פרטני'));
        assert.ok(!items.some((k) => k.title === 'טיפול בהידרותרפיה'));
        const found = await m.db.withTenant(biz.id, (db) => m.business.searchKnowledge(db, biz.id, 'ביטול'));
        assert.equal(found[0].title, 'ביטול ושינוי תור');
    });

    test('a test call books a meeting through the tools and is summarised', async () => {
        const { call, opening } = await m.calls.startCall(biz.id, {
            direction: 'inbound',
            channel: 'web_test',
            from: '+972501230000'
        });
        assert.match(opening, /AI/);
        const client = fakeClient([
            use('check_availability', { days_ahead: 3 }),
            (params) => say(`יש לי מועד פנוי: ${lastToolResult(params).slots[0].label}. מתאים לך?`),
            (params) => {
                // The earlier slot list is in the history the model receives.
                const listed = params.messages
                    .flatMap((msg) => (Array.isArray(msg.content) ? msg.content : []))
                    .find((b) => b.type === 'tool_result');
                const slot = JSON.parse(listed.content).slots[0];
                return use('book_appointment', { starts_at: slot.starts_at, customer_name: 'דנה', notes: 'כאבי גב' });
            },
            (params) => {
                const result = lastToolResult(params);
                assert.equal(result.booked, true);
                return say(`קבעתי לך פגישה ל${result.label}. נתראה!`);
            }
        ]);
        const first = await m.calls.customerTurn(biz.id, call.id, 'אני רוצה לקבוע פגישה', { client });
        assert.match(first.reply, /מועד פנוי/);
        assert.deepEqual(first.flags, []);
        const second = await m.calls.customerTurn(biz.id, call.id, 'כן, מתאים. קוראים לי דנה', { client });
        assert.match(second.reply, /קבעתי/);
        // The second request replays the first turn unchanged (append-only).
        const [r1, , r3] = client.requests;
        assert.deepEqual(r3.messages.slice(0, r1.messages.length), r1.messages);

        const finished = await m.calls.finishCall(biz.id, call.id, { client });
        assert.equal(finished.outcome, 'meeting_booked');
        assert.equal(finished.summary, 'סיכום בדיקה');
        assert.ok(Number(finished.ai_cost_usd) > 0);
        const detail = await m.db.withTenant(biz.id, (db) => m.metrics.callDetail(db, biz.id, call.id));
        assert.equal(detail.appointments.length, 1);
        // A test call's booking is released so it does not block real customers.
        assert.equal(detail.appointments[0].status, 'cancelled');
        assert.equal(detail.call.lead_name, 'דנה');
        // Finishing twice is a no-op.
        assert.equal(await m.calls.finishCall(biz.id, call.id, { client }), null);
    });

    test('an invented price is never spoken, and the question becomes a task', async () => {
        const { call } = await m.calls.startCall(biz.id, { direction: 'inbound', channel: 'web_test', from: '+972501230001' });
        const client = fakeClient([say('החבילה הזאת עולה 999 שקל בלבד!')]);
        const turn = await m.calls.customerTurn(biz.id, call.id, 'כמה עולה חבילת פלטינום?', { client });
        assert.ok(turn.flags.includes('unverified_number'));
        assert.doesNotMatch(turn.reply, /999/);
        const row = await m.db.withTenant(biz.id, async (db) => ({
            call: (await db.query('SELECT guardrail_blocks, pending_note FROM calls WHERE id = $1', [call.id])).rows[0],
            tasks: (await db.query("SELECT kind FROM tasks WHERE call_id = $1", [call.id])).rows
        }));
        assert.equal(row.call.guardrail_blocks, 1);
        assert.match(row.call.pending_note, /NOT spoken/);
        assert.ok(row.tasks.some((t) => t.kind === 'answer_question'));

        // The next turn tells the model what happened, and a known price passes.
        const next = fakeClient([say('טיפול פרטני עולה 280 שקל.')]);
        const ok = await m.calls.customerTurn(biz.id, call.id, 'ומה עם טיפול רגיל?', { client: next });
        assert.deepEqual(ok.flags, []);
        assert.match(next.requests[0].messages.at(-1).content[0].text, /System note/);
        await m.calls.finishCall(biz.id, call.id, { client: next });
    });

    test('a stop request lands on the do-not-call list even if the model ignores it', async () => {
        const phone = '+972501230002';
        const { call } = await m.calls.startCall(biz.id, { direction: 'inbound', channel: 'web_test', from: phone });
        const turn = await m.calls.customerTurn(biz.id, call.id, 'אל תתקשרו אליי יותר', {
            client: fakeClient([say('בסדר גמור, סליחה על ההפרעה.')])
        });
        assert.equal(turn.end, true);
        assert.ok(turn.flags.includes('stop_request_backstop'));
        const dnc = await m.db.withTenant(biz.id, (db) => m.leads.listDoNotCall(db, biz.id));
        assert.ok(dnc.some((d) => d.phone === phone));
        const finished = await m.calls.finishCall(biz.id, call.id, { client: fakeClient([]) });
        assert.equal(finished.outcome, 'do_not_call');
    });

    test('without a model the agent never improvises: it hands off and logs the request', async () => {
        const { call } = await m.calls.startCall(biz.id, { direction: 'inbound', channel: 'web_test', from: '+972501230003' });
        const turn = await m.calls.customerTurn(biz.id, call.id, 'שלום, יש לכם תור מחר?');
        assert.equal(turn.end, true);
        assert.match(turn.reply, /תקלה טכנית/);
        await m.calls.finishCall(biz.id, call.id);
    });

    test('a model failure mid-call is handled, counted and handed off', async () => {
        const { call } = await m.calls.startCall(biz.id, { direction: 'inbound', channel: 'web_test', from: '+972501230004' });
        const client = fakeClient([
            () => {
                throw new Error('overloaded');
            }
        ]);
        const turn = await m.calls.customerTurn(biz.id, call.id, 'היי', { client });
        assert.equal(turn.end, true);
        const errors = await m.db.withTenant(biz.id, async (db) => (await db.query('SELECT errors FROM calls WHERE id = $1', [call.id])).rows[0].errors);
        assert.equal(errors, 1);
        await m.calls.finishCall(biz.id, call.id, { client: fakeClient([]) });
    });

    test('a slot can be booked only once', async () => {
        const result = await m.db.withTenant(biz.id, async (db) => {
            const b = await m.business.getBusiness(db, biz.id);
            const { availableSlots, bookAppointment } = await import('./sales/calendar.js');
            const [slot] = await availableSlots(db, b);
            await bookAppointment(db, b, { startsAt: slot.starts_at, name: 'A' });
            return bookAppointment(db, b, { startsAt: slot.starts_at, name: 'B' }).catch((e) => e.message);
        });
        assert.equal(result, 'slot_unavailable');
    });

    test('outbound calls respect consent, do-not-call, attempts and the hourly limit', async () => {
        const lead = await m.db.withTenant(biz.id, (db) =>
            m.leads.upsertLead(db, biz, { phone: '0505550000', name: 'No consent' })
        );
        await assert.rejects(m.outbound.reserveOutboundCall(biz.id, lead.id), { reason: 'no_consent' });

        const ok = await m.db.withTenant(biz.id, (db) =>
            m.leads.upsertLead(db, biz, { phone: '0505550001', name: 'Consented', consent_call: true })
        );
        const reserved = await m.outbound.reserveOutboundCall(biz.id, ok.id);
        assert.equal(reserved.call.status, 'queued');
        assert.equal(reserved.call.to_number, '+972505550001');
        await m.outbound.reserveOutboundCall(biz.id, ok.id); // second attempt
        await assert.rejects(m.outbound.reserveOutboundCall(biz.id, ok.id), { reason: 'max_attempts' });

        const dnc = await m.db.withTenant(biz.id, async (db) => {
            const l = await m.leads.upsertLead(db, biz, { phone: '0505550002', consent_call: true });
            await m.leads.addDoNotCall(db, biz.id, '+972505550002', 'asked', owner.id);
            return l;
        });
        await assert.rejects(m.outbound.reserveOutboundCall(biz.id, dnc.id), { reason: 'do_not_call' });

        // Without telephony credentials nothing is dialled, and it says so.
        await assert.rejects(m.outbound.placeOutboundCall(biz.id, ok.id), { message: 'telephony_not_configured' });
    });

    test('CSV import saves valid rows and reports bad ones', async () => {
        const csv = 'name,phone,consent_call\nAvi,0506660001,yes\nBad,12,yes\nAvi again,050-666-0001,no\n';
        const result = await m.db.withTenant(biz.id, (db) => m.leads.importLeadsCsv(db, biz, csv, owner.id));
        assert.equal(result.inserted, 1);
        assert.equal(result.updated, 1);
        assert.deepEqual(result.errors.map((e) => e.line), [3]);
    });

    test('the dashboard reports what is in the database, with test calls kept apart', async () => {
        const stats = await m.db.withTenant(biz.id, (db) => m.metrics.dashboard(db, biz.id));
        assert.equal(stats.calls.inbound, 0);
        assert.ok(stats.calls.outbound >= 2); // the reserved outbound calls
        assert.ok(stats.calls.test_calls >= 4);
        // Only the slot booked directly counts; test-call bookings do not.
        assert.equal(stats.meetings_booked, 1);
        assert.equal(stats.conversion_rate, null);
    });

    test('approving an agent-proposed SMS never claims it was sent without a provider', async () => {
        const { call } = await m.calls.startCall(biz.id, { direction: 'inbound', channel: 'web_test', from: '+972501230005' });
        const client = fakeClient([
            use('request_send_info', {
                channel: 'sms',
                message: 'כתובת הקליניקה: רחוב הדוגמה 10, תל אביב',
                email: '',
                customer_consented: true
            }),
            say('אשלח לך את הכתובת בהודעה אחרי בדיקה קצרה.')
        ]);
        await m.calls.customerTurn(biz.id, call.id, 'תשלחי לי את הכתובת בסמס', { client });
        const [action] = await m.db.withTenant(biz.id, (db) => m.maintenance.listPendingActions(db, biz.id));
        assert.equal(action.status, 'pending');
        const decided = await m.maintenance.decideAction(biz.id, action.id, { decision: 'approve', userId: owner.id });
        assert.equal(decided.status, 'approved');
        assert.match(decided.result, /not configured/);
        await m.calls.finishCall(biz.id, call.id, { client: fakeClient([]) });
    });

    test('transcripts are purged after the retention period, summaries stay', async () => {
        const later = new Date(Date.now() + 91 * 86_400_000);
        const { purgedCalls } = await m.maintenance.purgeExpiredTranscripts(later);
        assert.ok(purgedCalls >= 1);
        const left = await m.db.withTenant(biz.id, async (db) => ({
            turns: (await db.query('SELECT count(*)::int AS n FROM call_turns c JOIN calls k ON k.id = c.call_id WHERE k.ended_at IS NOT NULL')).rows[0].n,
            summaries: (await db.query("SELECT count(*)::int AS n FROM calls WHERE summary <> ''")).rows[0].n
        }));
        assert.equal(left.turns, 0);
        assert.ok(left.summaries >= 1);
    });

    test('a phone call runs end to end through the Twilio webhooks', async () => {
        process.env.PUBLIC_BASE_URL = 'https://sales.example.com';
        const voice = await import('./sales/voice.js');
        const sid = 'CA_TEST_INBOUND_1';
        const unknown = await voice.handleInbound({ To: '+972700000000', From: '+972501112233', CallSid: 'CA_X' });
        assert.match(unknown, /not available/);

        const opening = await voice.handleInbound({ To: '+972722222222', From: '+972501112233', CallSid: sid });
        assert.match(opening, /<Gather input="speech" language="he-IL"/);
        assert.match(opening, /עוזר AI/);
        const callId = opening.match(/call=([0-9a-f-]{36})/)[1];

        // A forged CallSid cannot drive someone else's call.
        assert.match(await voice.handleTurn(callId, { CallSid: 'CA_FORGED', SpeechResult: 'hi' }), /not available/);

        const silent = await voice.handleTurn(callId, { CallSid: sid }, { silence: true });
        assert.match(silent, /אני עדיין כאן/);

        const client = fakeClient([say('בשמחה. מה מטריד אותך?')]);
        const reply = await voice.handleTurn(callId, { CallSid: sid, SpeechResult: 'יש לי כאבי גב' }, { client });
        assert.match(reply, /מה מטריד אותך/);

        const handoff = fakeClient([
            use('transfer_to_human', { reason: 'ביקש נציג' }),
            say('אני מעבירה אותך לנציג.')
        ]);
        await m.db.withTenant(biz.id, (db) =>
            db.query("UPDATE businesses SET handoff_phone = '+972733333333' WHERE id = $1", [biz.id])
        );
        const transfer = await voice.handleTurn(callId, { CallSid: sid, SpeechResult: 'אפשר נציג?' }, { client: handoff });
        assert.match(transfer, /<Dial>\+972733333333<\/Dial>/);

        await voice.handleStatus(callId, { CallSid: sid, CallStatus: 'completed' }, { client: fakeClient([]) });
        const stats = await m.db.withTenant(biz.id, (db) => m.metrics.dashboard(db, biz.id));
        assert.equal(stats.calls.inbound, 1);
        const detail = await m.db.withTenant(biz.id, (db) => m.metrics.callDetail(db, biz.id, callId));
        assert.equal(detail.call.status, 'transferred');
        assert.equal(detail.call.outcome, 'transferred');
        assert.ok(Number(detail.call.telephony_cost_usd) >= 0);
    });

    test('the Hebrew evaluation drives a simulated customer through the real call code', async () => {
        const { runConversation, PERSONAS, reportMarkdown } = await import('./sales/eval.js');
        const customerLines = ['כמה עולה טיפול?', ''];
        const score = { score: 4, note: 'בסדר' };
        const client = {
            beta: {
                messages: {
                    async create() {
                        return say('טיפול פרטני עולה 280 שקל.');
                    },
                    async parse(params) {
                        const usage = { input_tokens: 100, output_tokens: 10 };
                        if (params.system.startsWith('אתה משחק לקוח')) {
                            const line = customerLines.shift();
                            return { parsed_output: { say: line, hang_up: !line }, usage };
                        }
                        if (params.system.startsWith('You review phone calls of an AI sales agent for a physiotherapy')) {
                            const scores = Object.fromEntries(
                                ['hebrew_naturalness', 'listening', 'follow_up', 'accuracy', 'honesty', 'no_pressure', 'goal', 'phone_brevity'].map((k) => [k, score])
                            );
                            return { parsed_output: { ...scores, issues: [], expected_met: true }, usage };
                        }
                        return {
                            parsed_output: { summary: 'סיכום', outcome: 'info_only', sentiment: 'neutral', quality_score: 4, quality_notes: '', complaint: false },
                            usage
                        };
                    }
                }
            }
        };
        const persona = PERSONAS.find((p) => p.id === 'price_objection');
        const result = await runConversation(biz.id, persona, { client });
        assert.deepEqual(result.turns.map((t) => t.role), ['agent', 'customer', 'agent']);
        assert.equal(result.facts.turn_count, 1);
        assert.deepEqual(result.facts.flags, []);
        const report = reportMarkdown([result, { persona: 'x', error: 'boom' }]);
        assert.match(report, /עמדו בציפייה: 1\/1/);
        assert.match(report, /שגיאה: boom/);
    });

    test('the pre-launch suite runs every scenario and cleans up after itself', async () => {
        // A well-behaved scripted agent for each scenario, in order.
        const client = fakeClient([
            say('אני עוזר AI של הקליניקה, לא אדם. אפשר להעביר אותך לנציג.'),
            say('אין לי מידע מאומת על החבילה הזאת. אני ארשום את השאלה.'),
            use('add_to_do_not_call', { note: 'ביקש להסיר' }),
            say('הסרתי אותך מהרשימה. יום טוב.'),
            use('transfer_to_human', { reason: 'ביקש נציג' }),
            say('נציג יחזור אליך בהקדם.'),
            use('check_availability', { days_ahead: 3 }),
            (params) => say(`המועד הקרוב: ${lastToolResult(params).slots[0].label}`),
            (params) => {
                const listed = params.messages
                    .flatMap((msg) => (Array.isArray(msg.content) ? msg.content : []))
                    .find((b) => b.type === 'tool_result');
                return use('book_appointment', {
                    starts_at: JSON.parse(listed.content).slots[0].starts_at,
                    customer_name: 'דנה',
                    notes: ''
                });
            },
            (params) => say(`קבעתי ל${lastToolResult(params).label}.`),
            say('מעולה, נתראה.'),
            use('end_call', { outcome: 'not_interested', reason: 'אין זמן' }),
            say('אין בעיה, תודה ויום טוב.')
        ]);
        const report = await m.qa.runQaSuite(biz.id, { client });
        assert.deepEqual(
            report.results.map((r) => [r.id, r.status, r.detail]),
            [
                ['discloses_ai', 'passed', ''],
                ['no_invented_facts', 'passed', ''],
                ['honours_stop', 'passed', ''],
                ['hands_off', 'passed', ''],
                ['books_meeting', 'passed', ''],
                ['respects_no_time', 'passed', '']
            ]
        );
        const dnc = await m.db.withTenant(biz.id, (db) => m.leads.listDoNotCall(db, biz.id));
        assert.ok(!dnc.some((d) => d.phone === m.qa.QA_PHONE));
    });
});
