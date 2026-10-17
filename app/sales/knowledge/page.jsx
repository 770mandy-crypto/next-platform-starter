'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, BUTTON, BUTTON_SECONDARY, Card, ErrorLine, Field, INPUT, useSales } from 'components/sales/shell';

const EMPTY = { kind: 'service', title: '', content: '', price: '', currency: 'ILS', active: true, verified: true };

export default function KnowledgePage() {
    const { t } = useSales();
    const k = t.knowledge;
    const [items, setItems] = useState(null);
    const [editing, setEditing] = useState(null); // { id?, ...fields }
    const [error, setError] = useState(null);

    const load = useCallback(() => api('/knowledge').then((d) => setItems(d.items), setError), []);
    useEffect(() => {
        load();
    }, [load]);

    async function save(event) {
        event.preventDefault();
        setError(null);
        const { id, updated_at, ...fields } = editing;
        const body = { ...fields, price: fields.price === '' || fields.price === null ? null : Number(fields.price) };
        try {
            await api(id ? `/knowledge/${id}` : '/knowledge', { method: id ? 'PUT' : 'POST', body });
            setEditing(null);
            load();
        } catch (e) {
            setError(e);
        }
    }

    async function remove(id) {
        if (!window.confirm(t.remove + '?')) return;
        await api(`/knowledge/${id}`, { method: 'DELETE' }).catch(setError);
        load();
    }

    return (
        <div className="space-y-4">
            <p className="rounded border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{k.note}</p>
            {editing ? (
                <Card>
                    <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
                        <Field label={k.kind}>
                            <select className={INPUT} value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                                {Object.entries(k.kinds).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label={k.title}>
                            <input className={INPUT} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
                        </Field>
                        <Field label={k.content} className="md:col-span-2">
                            <textarea className={INPUT} rows={4} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                        </Field>
                        <Field label={k.price}>
                            <input className={INPUT} type="number" min="0" step="0.01" value={editing.price ?? ''} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                        </Field>
                        <Field label={k.currency}>
                            <input className={INPUT} maxLength={3} dir="ltr" value={editing.currency} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} />
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                            {k.active}
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={editing.verified} onChange={(e) => setEditing({ ...editing, verified: e.target.checked })} />
                            {k.verified}
                        </label>
                        <div className="flex gap-2 md:col-span-2">
                            <button className={BUTTON}>{t.save}</button>
                            <button type="button" className={BUTTON_SECONDARY} onClick={() => setEditing(null)}>
                                {t.cancel}
                            </button>
                        </div>
                    </form>
                </Card>
            ) : (
                <button className={BUTTON} onClick={() => setEditing(EMPTY)}>
                    + {t.add}
                </button>
            )}
            {error && <ErrorLine error={error} />}
            <Card>
                {!items ? (
                    <p className="text-slate-500">{t.loading}</p>
                ) : !items.length ? (
                    <p className="text-sm text-slate-500">{t.none}</p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <li key={item.id} className="flex flex-wrap items-start gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold">
                                        <span className="me-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal">{k.kinds[item.kind]}</span>
                                        {item.title}
                                        {item.price !== null && (
                                            <span className="ms-2 text-sm font-normal text-slate-600">
                                                {item.price} {item.currency}
                                            </span>
                                        )}
                                    </div>
                                    <p className="whitespace-pre-line text-sm text-slate-600">{item.content}</p>
                                </div>
                                <span className={`text-xs ${item.verified && item.active ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {item.verified ? `✓ ${k.verified}` : `✗ ${k.verified}`} · {item.active ? k.active : `✗ ${k.active}`}
                                </span>
                                <button className={BUTTON_SECONDARY} onClick={() => setEditing({ ...item, price: item.price ?? '' })}>
                                    {t.edit}
                                </button>
                                <button className={BUTTON_SECONDARY} onClick={() => remove(item.id)}>
                                    {t.remove}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
