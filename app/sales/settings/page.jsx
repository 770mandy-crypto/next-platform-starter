'use client';

import { useEffect, useState } from 'react';
import { api, BUTTON, Card, ErrorLine, Field, INPUT, useSales } from 'components/sales/shell';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function SettingsPage() {
    const { t, refresh } = useSales();
    const s = t.settings;
    const [form, setForm] = useState(null);
    const [role, setRole] = useState(null);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api('/business').then((d) => {
            setForm(d.business);
            setRole(d.role);
        }, setError);
    }, []);

    if (error && !form) return <ErrorLine error={error} />;
    if (!form) return <p className="text-slate-500">{t.loading}</p>;

    const set = (key) => (e) => {
        const target = e.target;
        const value = target.type === 'checkbox' ? target.checked : target.type === 'number' ? Number(target.value) : target.value;
        setForm({ ...form, [key]: value });
        setSaved(false);
    };
    const text = (key, label, props = {}) => (
        <Field label={label}>
            <input className={INPUT} value={form[key] ?? ''} onChange={set(key)} {...props} />
        </Field>
    );
    const area = (key, label) => (
        <Field label={label}>
            <textarea className={INPUT} rows={3} value={form[key] ?? ''} onChange={set(key)} />
        </Field>
    );
    const number = (key, label, props = {}) => (
        <Field label={label}>
            <input className={INPUT} type="number" value={form[key]} onChange={set(key)} {...props} />
        </Field>
    );
    const check = (key, label) => (
        <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(form[key])} onChange={set(key)} />
            {label}
        </label>
    );

    function setHours(day, field, value) {
        const hours = { ...form.business_hours };
        const range = hours[day]?.[0] ?? { start: '09:00', end: '17:00' };
        hours[day] = value === null ? [] : [{ ...range, [field]: value }];
        setForm({ ...form, business_hours: hours });
        setSaved(false);
    }

    function setWindow(patch) {
        setForm({ ...form, calling_window: { ...form.calling_window, ...patch } });
        setSaved(false);
    }

    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const fields = { ...form };
            for (const key of ['id', 'created_at', 'updated_at']) delete fields[key];
            fields.inbound_number = fields.inbound_number || null;
            fields.business_hours = Object.fromEntries(Object.entries(fields.business_hours).filter(([, v]) => v.length));
            const { business } = await api('/business', { method: 'PUT', body: fields });
            setForm(business);
            setSaved(true);
            refresh();
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }

    const readOnly = role !== 'owner';

    return (
        <form onSubmit={save} className="space-y-4">
            <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{s.legal}</p>
            <fieldset disabled={readOnly} className="space-y-4">
                <Card className="grid gap-3 md:grid-cols-2">
                    <h3 className="font-bold md:col-span-2">{s.business}</h3>
                    {text('name', s.name, { required: true })}
                    {text('industry', s.industry)}
                    {text('country', s.country, { maxLength: 2, dir: 'ltr' })}
                    {text('timezone', s.timezone, { dir: 'ltr' })}
                    {text('contact_phone', s.contactPhone, { dir: 'ltr' })}
                    {text('contact_email', s.contactEmail, { dir: 'ltr', type: 'email' })}
                    <div className="md:col-span-2">{area('target_audience', s.audience)}</div>
                </Card>

                <Card className="grid gap-3 md:grid-cols-2">
                    <h3 className="font-bold md:col-span-2">{s.agent}</h3>
                    {text('agent_name', s.agentName)}
                    <Field label={s.goal}>
                        <select className={INPUT} value={form.sales_goal} onChange={set('sales_goal')}>
                            {Object.entries(s.goals).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label={s.language}>
                        <select className={INPUT} value={form.language} onChange={set('language')}>
                            <option value="he-IL">עברית (he-IL)</option>
                            <option value="en-US">English (en-US)</option>
                            <option value="en-GB">English (en-GB)</option>
                        </select>
                    </Field>
                    {text('voice', s.voice, { dir: 'ltr' })}
                    <div className="md:col-span-2">{area('tone', s.tone)}</div>
                    {text('handoff_phone', s.handoffPhone, { dir: 'ltr' })}
                    {text('inbound_number', s.inboundNumber, { dir: 'ltr' })}
                    <div className="md:col-span-2">{area('handoff_rules', s.handoffRules)}</div>
                </Card>

                <Card className="space-y-3">
                    <h3 className="font-bold">{s.hours}</h3>
                    {number('appointment_minutes', s.meetingMinutes, { min: 5, max: 480 })}
                    <div className="grid gap-2 sm:grid-cols-2">
                        {DAYS.map((day) => {
                            const range = form.business_hours?.[day]?.[0];
                            return (
                                <div key={day} className="flex items-center gap-2 text-sm">
                                    <span className="w-8">{s.dayNames[day]}</span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(range)}
                                        onChange={(e) => setHours(day, 'start', e.target.checked ? range?.start ?? '09:00' : null)}
                                    />
                                    {range ? (
                                        <>
                                            <input type="time" className={INPUT} value={range.start} onChange={(e) => setHours(day, 'start', e.target.value)} />
                                            <input type="time" className={INPUT} value={range.end} onChange={(e) => setHours(day, 'end', e.target.value)} />
                                        </>
                                    ) : (
                                        <span className="text-slate-400">{s.closed}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card className="grid gap-3 md:grid-cols-2">
                    <h3 className="font-bold md:col-span-2">{s.outbound}</h3>
                    <div className="md:col-span-2">{check('outbound_enabled', s.outboundEnabled)}</div>
                    <Field label={s.windowStart}>
                        <input type="time" className={INPUT} value={form.calling_window.start} onChange={(e) => setWindow({ start: e.target.value })} />
                    </Field>
                    <Field label={s.windowEnd}>
                        <input type="time" className={INPUT} value={form.calling_window.end} onChange={(e) => setWindow({ end: e.target.value })} />
                    </Field>
                    <div className="md:col-span-2">
                        <span className="mb-1 block text-sm text-slate-600">{s.windowDays}</span>
                        <div className="flex flex-wrap gap-3 text-sm">
                            {DAYS.map((day) => (
                                <label key={day} className="flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        checked={form.calling_window.days.includes(day)}
                                        onChange={(e) =>
                                            setWindow({
                                                days: e.target.checked
                                                    ? [...form.calling_window.days, day].sort()
                                                    : form.calling_window.days.filter((d) => d !== day)
                                            })
                                        }
                                    />
                                    {s.dayNames[day]}
                                </label>
                            ))}
                        </div>
                    </div>
                    {number('max_calls_per_hour', s.maxPerHour, { min: 0, max: 1000 })}
                    {number('max_attempts_per_lead', s.maxAttempts, { min: 1, max: 20 })}
                </Card>

                <Card className="grid gap-3 md:grid-cols-2">
                    <h3 className="font-bold md:col-span-2">{s.privacy}</h3>
                    <div className="md:col-span-2">{check('store_transcripts', s.storeTranscripts)}</div>
                    {number('retention_days', s.retentionDays, { min: 1, max: 3650 })}
                    {number('telephony_cost_per_minute', s.phoneRate, { min: 0, step: 0.0001 })}
                </Card>
            </fieldset>
            {error && <ErrorLine error={error} />}
            {!readOnly && (
                <div className="flex items-center gap-3">
                    <button className={BUTTON} disabled={busy}>
                        {t.save}
                    </button>
                    {saved && <span className="text-sm text-emerald-700">✓ {t.saved}</span>}
                </div>
            )}
        </form>
    );
}
