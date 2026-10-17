'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, BUTTON, Card, ErrorLine, useSales } from 'components/sales/shell';

const COLORS = {
    passed: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    skipped: 'bg-slate-100 text-slate-600'
};

export default function QaPage() {
    const { t, status } = useSales();
    const q = t.qa;
    const [report, setReport] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    async function run() {
        setBusy(true);
        setError(null);
        try {
            setReport(await api('/qa', { method: 'POST', body: {} }));
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-4">
            <Card className="space-y-3">
                <p className="text-sm text-slate-600">{q.intro}</p>
                <button className={BUTTON} onClick={run} disabled={busy || !status?.ai}>
                    {busy ? q.running : q.run}
                </button>
                {!status?.ai && <p className="text-sm text-amber-800">{t.errors.ai_not_configured}</p>}
                {error && <ErrorLine error={error} />}
            </Card>
            {report && (
                <Card>
                    <h3 className="mb-3 font-bold">
                        {report.passed}/{report.total} {q.passed}
                    </h3>
                    <ul className="space-y-3">
                        {report.results.map((r) => (
                            <li key={r.id} className="rounded border border-slate-200 p-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${COLORS[r.status]}`}>{q.statuses[r.status]}</span>
                                    <span className="font-semibold">{r.title}</span>
                                    {r.callId && <Link href={`/sales/calls/${r.callId}`}>{t.calls.transcript}</Link>}
                                </div>
                                {r.detail && <p className="mt-1 text-slate-600">{r.detail}</p>}
                                {r.replies?.map((reply, i) => (
                                    <p key={i} className="mt-1 text-slate-500">
                                        {t.calls.agent}: {reply}
                                    </p>
                                ))}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}
