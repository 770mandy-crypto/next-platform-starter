'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from 'components/bot/keys';

function StepRow({ step }) {
    const good = step.ok;
    return (
        <li className="flex flex-col gap-1 p-3 border rounded-lg border-white/10 bg-white/5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">
                    {good ? '✅' : '❌'} {step.name}
                </span>
                <span className="text-xs tabular-nums opacity-60" dir="ltr">
                    {step.status ?? 'no response'} · {step.ms}ms
                    {step.setCookieCount > 0 && ` · ${step.setCookieCount} cookies`}
                </span>
            </div>
            {step.error && (
                <div className="text-sm text-red-300" dir="ltr">
                    {step.error}
                </div>
            )}
            {step.bodyPrefix && (
                <div className="p-2 overflow-x-auto text-xs rounded bg-black/30" dir="ltr">
                    <code className="whitespace-pre">{step.bodyPrefix}</code>
                </div>
            )}
        </li>
    );
}

export function DiagRunner() {
    const [state, setState] = useState({ status: 'loading' });
    const [copied, setCopied] = useState(false);

    async function run() {
        setState({ status: 'loading' });
        setCopied(false);
        try {
            const response = await apiFetch('/api/diag');
            const payload = await response.json();
            setState({ status: 'done', payload });
        } catch (error) {
            setState({ status: 'error', error: String(error) });
        }
    }

    useEffect(() => {
        run();
    }, []);

    async function copyReport() {
        try {
            await navigator.clipboard.writeText(JSON.stringify(state.payload, null, 2));
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    if (state.status === 'loading') {
        return <div className="p-6 text-center rounded-lg bg-white/5 animate-pulse">בודק את כל השלבים…</div>;
    }

    if (state.status === 'error') {
        return <div className="p-6 rounded-lg bg-red-500/15 border border-red-400/40">האבחון עצמו נכשל: {state.error}</div>;
    }

    const { payload } = state;

    return (
        <div className="flex flex-col gap-5">
            <div className="p-4 border rounded-lg border-primary/40 bg-primary/5">
                <div className="mb-1 font-bold">מסקנה</div>
                <p dir="ltr" className="text-sm">
                    {payload.verdict}
                </p>
            </div>

            <ul className="flex flex-col gap-2">
                {payload.steps.map((step) => (
                    <StepRow key={step.name} step={step} />
                ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={copyReport}
                    className="px-5 py-3 font-bold rounded bg-primary text-primary-content"
                >
                    {copied ? '✓ הועתק' : 'העתק דוח'}
                </button>
                <button type="button" onClick={run} className="px-4 py-2 rounded bg-white/10">
                    הרץ שוב
                </button>
                <span className="text-xs opacity-50" dir="ltr">
                    {payload.runtime?.region || 'region unknown'} · node {payload.runtime?.node}
                </span>
            </div>

            {/* A visible fallback for when the clipboard API is unavailable. */}
            <details className="text-xs">
                <summary className="cursor-pointer opacity-70">או העתק ידנית מכאן</summary>
                <pre className="p-3 mt-2 overflow-x-auto rounded bg-black/40" dir="ltr">
                    {JSON.stringify(payload, null, 2)}
                </pre>
            </details>
        </div>
    );
}
