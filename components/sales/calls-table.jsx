'use client';

import Link from 'next/link';
import { formatDate, money } from './shell';

export function CallsTable({ calls, t, lang }) {
    const c = t.calls;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-start text-slate-500">
                    <tr>
                        <th className="p-2 text-start">{c.when}</th>
                        <th className="p-2 text-start">{c.direction}</th>
                        <th className="p-2 text-start">{c.customer}</th>
                        <th className="p-2 text-start">{c.outcome}</th>
                        <th className="p-2 text-start">{c.duration}</th>
                        <th className="p-2 text-start">{c.quality}</th>
                        <th className="p-2 text-start">{c.cost}</th>
                    </tr>
                </thead>
                <tbody>
                    {calls.map((call) => (
                        <tr key={call.id} className="border-t border-slate-100">
                            <td className="p-2">
                                <Link href={`/sales/calls/${call.id}`}>{formatDate(call.started_at, lang)}</Link>
                            </td>
                            <td className="p-2">
                                {call.channel === 'web_test' ? `${c.test} · ` : ''}
                                {call.direction === 'inbound' ? c.inbound : c.outbound}
                            </td>
                            <td className="p-2" dir="ltr">
                                {call.lead_name || call.customer_number || '—'}
                            </td>
                            <td className="p-2">{call.outcome ? t.outcomes[call.outcome] : call.status}</td>
                            <td className="p-2 tabular-nums">{call.duration_seconds ? `${Math.round(call.duration_seconds)}s` : '—'}</td>
                            <td className="p-2">
                                {call.quality_score ?? '—'}
                                {call.guardrail_blocks > 0 && <span title={t.dash.blocks}> ⚠️</span>}
                                {call.complaint && <span title={t.dash.complaints}> 🚩</span>}
                            </td>
                            <td className="p-2 tabular-nums">{money(call.cost_usd)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
