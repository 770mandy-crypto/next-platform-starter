'use client';

import { use, useEffect, useState } from 'react';
import { Turn } from 'components/sales/turn';
import { api, Card, ErrorLine, formatDate, money, useSales } from 'components/sales/shell';

export default function CallDetailPage({ params }) {
    const { id } = use(params);
    const { t, lang } = useSales();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api(`/calls/${id}`).then(setData, setError);
    }, [id]);

    if (error) return <ErrorLine error={error} />;
    if (!data) return <p className="text-slate-500">{t.loading}</p>;
    const { call, turns, appointments } = data;
    const c = t.calls;

    return (
        <div className="space-y-4">
            <Card>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                    <Item label={c.when} value={formatDate(call.started_at, lang)} />
                    <Item
                        label={c.direction}
                        value={`${call.channel === 'web_test' ? `${c.test} · ` : ''}${call.direction === 'inbound' ? c.inbound : c.outbound}`}
                    />
                    <Item label={c.customer} value={call.lead_name || (call.direction === 'inbound' ? call.from_number : call.to_number) || '—'} />
                    <Item label={c.outcome} value={call.outcome ? t.outcomes[call.outcome] : call.status} />
                    <Item label={c.duration} value={call.duration_seconds ? `${call.duration_seconds}s` : '—'} />
                    <Item label={c.cost} value={money(call.cost_usd)} />
                    <Item label={c.quality} value={call.quality_score ?? '—'} />
                    <Item label={t.dash.blocks} value={`${call.guardrail_blocks} · ${t.dash.errors}: ${call.errors}`} />
                </dl>
                {call.goal && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{call.goal}</p>}
            </Card>
            <Card>
                <h3 className="mb-1 font-bold">{c.summary}</h3>
                <p className="text-sm">{call.summary || '—'}</p>
                {call.quality_notes && <p className="mt-2 text-sm text-amber-800">{call.quality_notes}</p>}
                {appointments.map((a) => (
                    <p key={a.id} className="mt-2 text-sm">
                        📅 {formatDate(a.starts_at, lang)} ({a.status})
                    </p>
                ))}
            </Card>
            <Card>
                <h3 className="mb-2 font-bold">{c.transcript}</h3>
                {call.transcript_purged ? (
                    <p className="text-sm text-slate-500">{c.purged}</p>
                ) : (
                    <ol className="space-y-2">
                        {turns.map((turn, i) => (
                            <Turn key={i} turn={turn} t={t} />
                        ))}
                    </ol>
                )}
            </Card>
        </div>
    );
}

function Item({ label, value }) {
    return (
        <div>
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
        </div>
    );
}
