'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, BUTTON, BUTTON_SECONDARY, Card, ErrorLine, formatDate, useSales } from 'components/sales/shell';

export default function TasksPage() {
    const { t, lang } = useSales();
    const tk = t.tasks;
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [edits, setEdits] = useState({});

    const load = useCallback(() => {
        Promise.all([api('/tasks'), api('/appointments'), api('/actions')]).then(
            ([tasks, appointments, actions]) =>
                setData({ tasks: tasks.tasks, appointments: appointments.appointments, actions: actions.actions }),
            setError
        );
    }, []);
    useEffect(() => {
        load();
    }, [load]);

    async function act(fn) {
        setError(null);
        try {
            await fn();
        } catch (e) {
            setError(e);
        }
        load();
    }

    if (!data) return error ? <ErrorLine error={error} /> : <p className="text-slate-500">{t.loading}</p>;

    return (
        <div className="space-y-4">
            {error && <ErrorLine error={error} />}
            <Card>
                <h3 className="mb-2 font-bold">{tk.actions}</h3>
                <ul className="space-y-3">
                    {data.actions.map((a) => (
                        <li key={a.id} className="rounded border border-slate-200 p-3 text-sm">
                            <div className="mb-1 text-slate-500">
                                {a.kind} → <span dir="ltr">{a.payload.to}</span> · {a.lead_name || ''} · {formatDate(a.created_at, lang)} ·{' '}
                                <b>{a.status}</b>
                                {a.call_id && (
                                    <>
                                        {' · '}
                                        <Link href={`/sales/calls/${a.call_id}`}>{t.nav.calls}</Link>
                                    </>
                                )}
                            </div>
                            {a.status === 'pending' ? (
                                <>
                                    <textarea
                                        className="w-full rounded border border-slate-300 p-2"
                                        rows={2}
                                        value={edits[a.id] ?? a.payload.message}
                                        onChange={(e) => setEdits({ ...edits, [a.id]: e.target.value })}
                                    />
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            className={BUTTON}
                                            onClick={() =>
                                                act(() =>
                                                    api(`/actions/${a.id}`, { method: 'POST', body: { decision: 'approve', message: edits[a.id] } })
                                                )
                                            }
                                        >
                                            {tk.approve}
                                        </button>
                                        <button
                                            className={BUTTON_SECONDARY}
                                            onClick={() => act(() => api(`/actions/${a.id}`, { method: 'POST', body: { decision: 'reject' } }))}
                                        >
                                            {tk.reject}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p>
                                    {a.payload.message}
                                    {a.result && <span className="block text-xs text-slate-500">{a.result}</span>}
                                </p>
                            )}
                        </li>
                    ))}
                    {!data.actions.length && <li className="text-sm text-slate-500">{t.none}</li>}
                </ul>
            </Card>

            <Card>
                <h3 className="mb-2 font-bold">{tk.tasks}</h3>
                <ul className="divide-y divide-slate-100">
                    {data.tasks.map((task) => (
                        <li key={task.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{tk.kinds[task.kind]}</span>
                            {task.channel === 'web_test' && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">{t.calls.test}</span>
                            )}
                            <span className="min-w-0 flex-1">
                                {task.description}
                                {(task.lead_name || task.lead_phone) && (
                                    <span className="text-slate-500">
                                        {' '}
                                        — {task.lead_name} <span dir="ltr">{task.lead_phone}</span>
                                    </span>
                                )}
                            </span>
                            {task.due_at && (
                                <span className="text-slate-500">
                                    {tk.due}: {formatDate(task.due_at, lang)}
                                </span>
                            )}
                            {task.call_id && <Link href={`/sales/calls/${task.call_id}`}>{t.nav.calls}</Link>}
                            <button
                                className={BUTTON_SECONDARY}
                                onClick={() => act(() => api(`/tasks/${task.id}`, { method: 'PATCH', body: { status: 'done' } }))}
                            >
                                ✓ {tk.done}
                            </button>
                        </li>
                    ))}
                    {!data.tasks.length && <li className="text-sm text-slate-500">{t.none}</li>}
                </ul>
            </Card>

            <Card>
                <h3 className="mb-2 font-bold">{tk.appointments}</h3>
                <ul className="space-y-1 text-sm">
                    {data.appointments.map((a) => (
                        <li key={a.id} className={a.status === 'cancelled' ? 'text-slate-400 line-through' : ''}>
                            📅 {formatDate(a.starts_at, lang)} — {a.customer_name} <span dir="ltr">{a.customer_phone}</span> {a.notes}
                            {a.channel === 'web_test' && ` (${t.calls.test})`}
                        </li>
                    ))}
                    {!data.appointments.length && <li className="text-slate-500">{t.none}</li>}
                </ul>
            </Card>
        </div>
    );
}
