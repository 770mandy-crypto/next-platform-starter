'use client';

import { useEffect, useRef, useState } from 'react';
import { Turn } from 'components/sales/turn';
import { api, BUTTON, BUTTON_SECONDARY, Card, ErrorLine, Field, INPUT, useSales } from 'components/sales/shell';

export default function TestCallPage() {
    const { t, lang } = useSales();
    const tt = t.test;
    const [setup, setSetup] = useState({ direction: 'inbound', leadId: '', goal: '' });
    const [leads, setLeads] = useState([]);
    const [business, setBusiness] = useState(null);
    const [callId, setCallId] = useState(null);
    const [turns, setTurns] = useState([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [ended, setEnded] = useState(null);
    const [error, setError] = useState(null);
    const [speak, setSpeak] = useState(true);
    const [listening, setListening] = useState(false);
    const recognition = useRef(null);
    const bottom = useRef(null);

    useEffect(() => {
        api('/leads').then((d) => setLeads(d.leads), () => {});
        api('/business').then((d) => setBusiness(d.business), () => {});
    }, []);
    useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [turns]);

    const voiceLang = business?.language ?? (lang === 'he' ? 'he-IL' : 'en-US');

    function say(line) {
        if (!speak || typeof window === 'undefined' || !window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(line);
        utterance.lang = voiceLang;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    async function start() {
        setBusy(true);
        setError(null);
        setEnded(null);
        try {
            const data = await api('/test-call', { method: 'POST', body: { ...setup, leadId: setup.leadId || undefined } });
            setCallId(data.callId);
            setTurns([{ role: 'agent', content: data.reply }]);
            say(data.reply);
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }

    async function send(line) {
        const content = String(line ?? text).trim();
        if (!content || !callId) return;
        setText('');
        setTurns((prev) => [...prev, { role: 'customer', content }]);
        setBusy(true);
        setError(null);
        try {
            const data = await api(`/test-call/${callId}`, { method: 'POST', body: { text: content } });
            const tools = (data.toolEvents ?? []).map((e) => ({ role: 'tool', tool_name: e.name, flag: e.ok ? null : 'error' }));
            setTurns((prev) => [...prev, ...tools, { role: 'agent', content: data.reply, flag: data.flags?.join(', ') || null }]);
            say(data.reply);
            if (data.ended) setEnded(data);
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }

    async function end() {
        setBusy(true);
        try {
            setEnded(await api(`/test-call/${callId}`, { method: 'POST', body: { action: 'end' } }));
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }

    function listen() {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            setError(new Error(tt.micUnsupported));
            return;
        }
        // Speaking over the agent interrupts it, as on a phone call.
        window.speechSynthesis?.cancel();
        const r = new Recognition();
        r.lang = voiceLang;
        r.interimResults = false;
        r.onresult = (event) => send(event.results[0][0].transcript);
        r.onend = () => setListening(false);
        r.onerror = () => setListening(false);
        recognition.current = r;
        setListening(true);
        r.start();
    }

    if (!callId) {
        return (
            <Card className="max-w-2xl space-y-4">
                <p className="text-sm text-slate-600">{tt.intro}</p>
                <div className="flex gap-4 text-sm">
                    {['inbound', 'outbound'].map((d) => (
                        <label key={d} className="flex items-center gap-1">
                            <input type="radio" checked={setup.direction === d} onChange={() => setSetup({ ...setup, direction: d })} />
                            {tt[d]}
                        </label>
                    ))}
                </div>
                <Field label={tt.lead}>
                    <select className={INPUT} value={setup.leadId} onChange={(e) => setSetup({ ...setup, leadId: e.target.value })}>
                        <option value="">{tt.noLead}</option>
                        {leads.map((l) => (
                            <option key={l.id} value={l.id}>
                                {l.name || l.phone}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={tt.goal}>
                    <input className={INPUT} value={setup.goal} onChange={(e) => setSetup({ ...setup, goal: e.target.value })} />
                </Field>
                {error && <ErrorLine error={error} />}
                <button className={BUTTON} onClick={start} disabled={busy}>
                    {tt.start}
                </button>
            </Card>
        );
    }

    return (
        <Card className="max-w-3xl space-y-3">
            <ol className="max-h-[60vh] space-y-2 overflow-y-auto">
                {turns.map((turn, i) => (
                    <Turn key={i} turn={turn} t={t} />
                ))}
                <li ref={bottom} />
            </ol>
            {error && <ErrorLine error={error} />}
            {ended ? (
                <div className="space-y-2 rounded bg-slate-100 p-3 text-sm">
                    <p className="font-bold">
                        {tt.ended}
                        {ended.outcome ? ` — ${t.outcomes[ended.outcome]}` : ''}
                    </p>
                    {ended.summary && <p>{ended.summary}</p>}
                    <button
                        className={BUTTON}
                        onClick={() => {
                            setCallId(null);
                            setTurns([]);
                            setEnded(null);
                        }}
                    >
                        {tt.again}
                    </button>
                </div>
            ) : (
                <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        send();
                    }}
                >
                    <input className={`${INPUT} min-w-0 flex-1`} value={text} onChange={(e) => setText(e.target.value)} placeholder={tt.say} disabled={busy} />
                    <button className={BUTTON} disabled={busy || !text.trim()}>
                        {busy ? '…' : tt.send}
                    </button>
                    <button type="button" className={BUTTON_SECONDARY} onClick={listen} disabled={busy || listening}>
                        🎤 {listening ? tt.listening : tt.mic}
                    </button>
                    <button type="button" className={BUTTON_SECONDARY} onClick={end} disabled={busy}>
                        {tt.end}
                    </button>
                    <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={speak} onChange={(e) => setSpeak(e.target.checked)} />
                        {tt.speak}
                    </label>
                </form>
            )}
        </Card>
    );
}
