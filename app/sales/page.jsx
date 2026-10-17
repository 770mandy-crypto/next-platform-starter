'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CallsTable } from 'components/sales/calls-table';
import { api, Card, ErrorLine, money, useSales } from 'components/sales/shell';

function Stat({ label, value, hint }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
            {hint && <div className="text-xs text-slate-400">{hint}</div>}
        </div>
    );
}

export default function DashboardPage() {
    const { t, lang } = useSales();
    const [days, setDays] = useState(30);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([api(`/metrics?days=${days}`), api('/calls?channel=phone'), api('/tasks'), api('/actions')]).then(
            ([metrics, calls, tasks, actions]) => setData({ metrics, calls: calls.calls, tasks: tasks.tasks, actions: actions.actions }),
            setError
        );
    }, [days]);

    if (error) return <ErrorLine error={error} />;
    if (!data) return <p className="text-slate-500">{t.loading}</p>;
    const { metrics: m, calls, tasks, actions } = data;
    const d = t.dash;
    const pct = (v) => (v === null ? '—' : `${Math.round(v * 100)}%`);
    const pending = actions.filter((a) => a.status === 'pending');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm">
                <span>{d.period}:</span>
                {[7, 30, 90].map((n) => (
                    <button
                        key={n}
                        onClick={() => setDays(n)}
                        className={`rounded px-2 py-1 ${days === n ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white'}`}
                    >
                        {n} {d.days}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label={d.inbound} value={m.calls.inbound} />
                <Stat label={d.outbound} value={m.calls.outbound} />
                <Stat label={d.newLeads} value={m.leads.new_leads} />
                <Stat label={d.successful} value={m.calls.successful} />
                <Stat label={d.meetings} value={m.meetings_booked} />
                <Stat label={d.conversion} value={pct(m.conversion_rate)} />
                <Stat label={d.costLead} value={money(m.cost_per_lead_usd)} />
                <Stat label={d.costMeeting} value={money(m.cost_per_meeting_usd)} />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label={d.totalCost} value={money(m.calls.cost_usd)} hint={d.costNote} />
                <Stat label={d.quality} value={m.calls.avg_quality ? `${m.calls.avg_quality.toFixed(1)} / 5` : '—'} />
                <Stat
                    label={d.latency}
                    value={m.calls.avg_turn_latency_ms ? `${(m.calls.avg_turn_latency_ms / 1000).toFixed(1)}s` : '—'}
                />
                <Stat label={d.blocks} value={m.calls.guardrail_blocks} />
                <Stat label={d.errors} value={m.calls.errors} />
                <Stat label={d.complaints} value={m.calls.complaints} />
                <Stat label={d.stops} value={m.calls.stop_requests} />
                <Stat label={d.testCalls} value={m.calls.test_calls} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <h3 className="mb-2 font-bold">{d.leadStatus}</h3>
                    {Object.keys(m.leads.by_status).length ? (
                        <ul className="space-y-1 text-sm">
                            {Object.entries(m.leads.by_status).map(([status, n]) => (
                                <li key={status} className="flex justify-between">
                                    <span>{t.leadStatuses[status] ?? status}</span>
                                    <span className="tabular-nums">{n}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500">{t.none}</p>
                    )}
                </Card>
                <Card>
                    <h3 className="mb-2 font-bold">
                        <Link href="/sales/tasks">{d.openTasks}</Link> ({tasks.length})
                    </h3>
                    <ul className="space-y-1 text-sm">
                        {tasks.slice(0, 6).map((task) => (
                            <li key={task.id}>
                                <span className="text-slate-500">{t.tasks.kinds[task.kind]}:</span> {task.description}
                            </li>
                        ))}
                        {!tasks.length && <li className="text-slate-500">{t.none}</li>}
                    </ul>
                </Card>
                <Card>
                    <h3 className="mb-2 font-bold">
                        <Link href="/sales/tasks">{d.pending}</Link> ({pending.length})
                    </h3>
                    <ul className="space-y-1 text-sm">
                        {pending.slice(0, 6).map((a) => (
                            <li key={a.id}>
                                {a.kind}: {a.payload.message?.slice(0, 60)}
                            </li>
                        ))}
                        {!pending.length && <li className="text-slate-500">{t.none}</li>}
                    </ul>
                </Card>
            </div>

            <Card>
                <h3 className="mb-2 font-bold">{d.recent}</h3>
                {calls.length ? <CallsTable calls={calls.slice(0, 10)} t={t} lang={lang} /> : <p className="text-sm text-slate-500">{d.empty}</p>}
            </Card>
        </div>
    );
}
