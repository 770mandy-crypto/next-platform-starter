'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, BUTTON, BUTTON_SECONDARY, Card, ErrorLine, Field, formatDate, INPUT, useSales } from 'components/sales/shell';

const EMPTY = { name: '', phone: '', email: '', consent_call: false, consent_source: '', allowed_context: '' };

export default function LeadsPage() {
    const { t, lang, status } = useSales();
    const l = t.leads;
    const [leads, setLeads] = useState(null);
    const [dnc, setDnc] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [dncPhone, setDncPhone] = useState('');
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        api('/leads').then((d) => setLeads(d.leads), setError);
        api('/dnc').then((d) => setDnc(d.entries), () => {});
    }, []);
    useEffect(() => {
        load();
    }, [load]);

    async function act(fn) {
        setError(null);
        setMessage(null);
        try {
            const result = await fn();
            load();
            return result;
        } catch (e) {
            setError(e);
        }
    }

    async function importFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const csv = await file.text();
        event.target.value = '';
        const result = await act(() => api('/leads', { method: 'POST', body: { csv } }));
        if (result) {
            setMessage(
                `${l.imported}: ${result.inserted} · ${l.updated}: ${result.updated}` +
                    (result.errors.length ? ` · ${l.rowErrors}: ${result.errors.map((e) => `${e.line} (${e.error})`).join(', ')}` : '')
            );
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="space-y-2">
                    <h3 className="font-bold">{l.importCsv}</h3>
                    <p className="text-xs text-slate-500">{l.csvHelp}</p>
                    <input type="file" accept=".csv,text/csv" onChange={importFile} className="text-sm" />
                </Card>
                <Card>
                    <form
                        className="grid gap-2 sm:grid-cols-2"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (await act(() => api('/leads', { method: 'POST', body: form }))) setForm(EMPTY);
                        }}
                    >
                        <h3 className="font-bold sm:col-span-2">{l.addOne}</h3>
                        <Field label={t.name}>
                            <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </Field>
                        <Field label={l.phone}>
                            <input className={INPUT} dir="ltr" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </Field>
                        <Field label={l.consentSource}>
                            <input className={INPUT} value={form.consent_source} onChange={(e) => setForm({ ...form, consent_source: e.target.value })} />
                        </Field>
                        <label className="flex items-center gap-2 self-end text-sm">
                            <input type="checkbox" checked={form.consent_call} onChange={(e) => setForm({ ...form, consent_call: e.target.checked })} />
                            {l.consentCall}
                        </label>
                        <Field label={l.allowedContext} className="sm:col-span-2">
                            <input className={INPUT} value={form.allowed_context} onChange={(e) => setForm({ ...form, allowed_context: e.target.value })} />
                        </Field>
                        <button className={`${BUTTON} sm:col-span-2`}>{t.add}</button>
                    </form>
                </Card>
            </div>

            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {error && <ErrorLine error={error} />}

            <Card>
                <div className="mb-3 flex items-center gap-3">
                    <button
                        className={BUTTON_SECONDARY}
                        disabled={!status?.telephony}
                        title={status?.telephony ? '' : t.blocked.telephony_not_configured}
                        onClick={async () => {
                            const r = await act(() => api('/outbound/dispatch', { method: 'POST' }));
                            if (r) setMessage(`${r.placed.length} ✓ · ${r.skipped.map((s) => t.blocked[s.reason] ?? s.reason).join(', ')}`);
                        }}
                    >
                        📞 {l.dispatch}
                    </button>
                </div>
                {!leads ? (
                    <p className="text-slate-500">{t.loading}</p>
                ) : !leads.length ? (
                    <p className="text-sm text-slate-500">{t.none}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500">
                                <tr>
                                    <th className="p-2 text-start">{t.name}</th>
                                    <th className="p-2 text-start">{l.phone}</th>
                                    <th className="p-2 text-start">{t.status}</th>
                                    <th className="p-2 text-start">{l.consentCall}</th>
                                    <th className="p-2 text-start">{l.attempts}</th>
                                    <th className="p-2 text-start">{t.calls.when}</th>
                                    <th className="p-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="border-t border-slate-100">
                                        <td className="p-2">
                                            {lead.name || '—'}
                                            {lead.needs && <div className="text-xs text-slate-500">{lead.needs}</div>}
                                        </td>
                                        <td className="p-2" dir="ltr">
                                            {lead.phone}
                                        </td>
                                        <td className="p-2">
                                            <select
                                                className="rounded border border-slate-200 bg-white text-xs"
                                                value={lead.status}
                                                onChange={(e) => act(() => api(`/leads/${lead.id}`, { method: 'PATCH', body: { status: e.target.value } }))}
                                            >
                                                {Object.entries(t.leadStatuses).map(([value, label]) => (
                                                    <option key={value} value={value}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                            {lead.on_dnc && <div className="text-xs text-red-700">{l.onDnc}</div>}
                                        </td>
                                        <td className="p-2">{lead.consent_call ? t.yes : t.no}</td>
                                        <td className="p-2 tabular-nums">{lead.attempts}</td>
                                        <td className="p-2">{formatDate(lead.last_called_at || lead.created_at, lang)}</td>
                                        <td className="p-2">
                                            <button
                                                className={BUTTON_SECONDARY}
                                                disabled={!status?.telephony}
                                                title={status?.telephony ? '' : t.blocked.telephony_not_configured}
                                                onClick={() => act(() => api(`/leads/${lead.id}/call`, { method: 'POST', body: {} }))}
                                            >
                                                {l.call}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card className="space-y-2">
                <h3 className="font-bold">{l.dnc}</h3>
                <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        await act(() => api('/dnc', { method: 'POST', body: { phone: dncPhone } }));
                        setDncPhone('');
                    }}
                >
                    <input className={`${INPUT} max-w-xs`} dir="ltr" value={dncPhone} onChange={(e) => setDncPhone(e.target.value)} required />
                    <button className={BUTTON_SECONDARY}>{l.dncAdd}</button>
                </form>
                <ul className="text-sm">
                    {dnc.map((entry) => (
                        <li key={entry.phone} className="flex gap-2">
                            <span dir="ltr">{entry.phone}</span>
                            <span className="text-slate-500">{entry.reason}</span>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
    );
}
