// Dashboard numbers, computed from the database on every request. Browser
// test calls are counted separately so they never inflate real results.

const SUCCESS = ['meeting_booked', 'lead_captured', 'transferred', 'follow_up'];

export async function dashboard(db, businessId, { days = 30 } = {}) {
    const since = new Date(Date.now() - days * 86_400_000);
    const params = [businessId, since];

    const calls = (
        await db.query(
            `SELECT
                count(*) FILTER (WHERE channel = 'phone' AND direction = 'inbound')::int AS inbound,
                count(*) FILTER (WHERE channel = 'phone' AND direction = 'outbound')::int AS outbound,
                count(*) FILTER (WHERE channel = 'web_test')::int AS test_calls,
                count(*) FILTER (WHERE channel = 'phone' AND status IN ('completed', 'transferred') AND turn_count > 0)::int AS conversations,
                count(*) FILTER (WHERE channel = 'phone' AND outcome = ANY($3))::int AS successful,
                count(*) FILTER (WHERE channel = 'phone' AND status = 'active')::int AS live,
                coalesce(sum(ai_cost_usd + telephony_cost_usd) FILTER (WHERE channel = 'phone'), 0)::float AS cost_usd,
                coalesce(sum(ai_cost_usd) FILTER (WHERE channel = 'web_test'), 0)::float AS test_cost_usd,
                avg(quality_score) FILTER (WHERE channel = 'phone')::float AS avg_quality,
                coalesce(sum(guardrail_blocks) FILTER (WHERE channel = 'phone'), 0)::int AS guardrail_blocks,
                coalesce(sum(errors) FILTER (WHERE channel = 'phone'), 0)::int AS errors,
                count(*) FILTER (WHERE channel = 'phone' AND complaint)::int AS complaints,
                count(*) FILTER (WHERE channel = 'phone' AND outcome = 'do_not_call')::int AS stop_requests,
                (sum(total_latency_ms) FILTER (WHERE channel = 'phone')
                    / nullif(sum(turn_count) FILTER (WHERE channel = 'phone'), 0))::float AS avg_turn_latency_ms
             FROM calls WHERE business_id = $1 AND started_at >= $2`,
            [...params, SUCCESS]
        )
    ).rows[0];

    const leads = (
        await db.query(
            `SELECT count(*) FILTER (WHERE created_at >= $2 AND source <> 'test_call')::int AS new_leads,
                    count(*) FILTER (WHERE created_at >= $2 AND source IN ('inbound_call', 'outbound_call'))::int AS leads_from_calls
             FROM leads WHERE business_id = $1`,
            params
        )
    ).rows[0];

    const meetings = (
        await db.query(
            `SELECT count(*)::int AS n FROM appointments a
             LEFT JOIN calls c ON c.id = a.call_id AND c.business_id = a.business_id
             WHERE a.business_id = $1 AND a.created_at >= $2 AND a.status = 'booked'
               AND (c.channel IS NULL OR c.channel = 'phone')`,
            params
        )
    ).rows[0].n;

    const statuses = (
        await db.query('SELECT status, count(*)::int AS n FROM leads WHERE business_id = $1 GROUP BY status', [businessId])
    ).rows;

    const answered = calls.conversations;
    return {
        period_days: days,
        calls,
        leads: { ...leads, by_status: Object.fromEntries(statuses.map((s) => [s.status, s.n])) },
        meetings_booked: meetings,
        conversion_rate: answered ? calls.successful / answered : null,
        cost_per_lead_usd: leads.leads_from_calls ? calls.cost_usd / leads.leads_from_calls : null,
        cost_per_meeting_usd: meetings ? calls.cost_usd / meetings : null
    };
}

export async function recentCalls(db, businessId, { limit = 50, channel } = {}) {
    const { rows } = await db.query(
        `SELECT c.id, c.direction, c.channel, c.status, c.outcome, c.summary, c.started_at, c.duration_seconds,
                c.turn_count, c.quality_score, c.guardrail_blocks, c.errors, c.complaint,
                (c.ai_cost_usd + c.telephony_cost_usd)::float AS cost_usd, l.name AS lead_name,
                CASE WHEN c.direction = 'outbound' THEN c.to_number ELSE c.from_number END AS customer_number
         FROM calls c LEFT JOIN leads l ON l.id = c.lead_id AND l.business_id = c.business_id
         WHERE c.business_id = $1 AND ($2::text IS NULL OR c.channel = $2)
         ORDER BY c.started_at DESC LIMIT $3`,
        [businessId, channel ?? null, limit]
    );
    return rows;
}

export async function callDetail(db, businessId, callId) {
    const call = (
        await db.query(
            `SELECT c.*, (c.ai_cost_usd + c.telephony_cost_usd)::float AS cost_usd, l.name AS lead_name, l.status AS lead_status
             FROM calls c LEFT JOIN leads l ON l.id = c.lead_id AND l.business_id = c.business_id
             WHERE c.business_id = $1 AND c.id = $2`,
            [businessId, callId]
        )
    ).rows[0];
    if (!call) return null;
    delete call.model_messages;
    const turns = (
        await db.query(
            'SELECT role, content, tool_name, latency_ms, flag, created_at FROM call_turns WHERE call_id = $1 AND business_id = $2 ORDER BY id',
            [callId, businessId]
        )
    ).rows;
    const appointments = (
        await db.query('SELECT id, starts_at, ends_at, status FROM appointments WHERE business_id = $1 AND call_id = $2', [
            businessId,
            callId
        ])
    ).rows;
    return { call, turns, appointments };
}

export async function listTasks(db, businessId, { status = 'open' } = {}) {
    const { rows } = await db.query(
        `SELECT t.*, l.name AS lead_name, l.phone AS lead_phone, c.channel FROM tasks t
         LEFT JOIN leads l ON l.id = t.lead_id AND l.business_id = t.business_id
         LEFT JOIN calls c ON c.id = t.call_id AND c.business_id = t.business_id
         WHERE t.business_id = $1 AND t.status = $2 ORDER BY t.due_at NULLS LAST, t.created_at DESC LIMIT 200`,
        [businessId, status]
    );
    return rows;
}

export async function listAppointments(db, businessId) {
    const { rows } = await db.query(
        `SELECT a.*, c.channel FROM appointments a LEFT JOIN calls c ON c.id = a.call_id AND c.business_id = a.business_id
         WHERE a.business_id = $1 AND a.ends_at > now() - interval '7 days' ORDER BY a.starts_at LIMIT 200`,
        [businessId]
    );
    return rows;
}
