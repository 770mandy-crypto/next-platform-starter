'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { STRINGS } from './i18n';

const SalesContext = createContext(null);
export const useSales = () => useContext(SalesContext);

export async function api(path, { method = 'GET', body } = {}) {
    const response = await fetch(`/api/sales${path}`, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.code || data.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.detail = data.error;
        throw error;
    }
    return data;
}

// Turns an API error into a readable message in the current language.
export function errorText(t, error) {
    if (!error) return '';
    const key = error.message;
    return t.blocked[key] || t.errors[key] || error.detail || key;
}

const NAV = ['dashboard', 'calls', 'leads', 'tasks', 'knowledge', 'settings', 'test', 'qa'];
const HREF = { dashboard: '/sales' };

export function SalesShell({ children }) {
    const [lang, setLang] = useState('he');
    const [me, setMe] = useState(undefined);
    const [status, setStatus] = useState(null);
    const t = STRINGS[lang];

    useEffect(() => {
        try {
            const saved = localStorage.getItem('sales_lang');
            if (saved === 'en' || saved === 'he') setLang(saved);
        } catch {}
        api('/status').then(setStatus, () => setStatus(null));
    }, []);

    const refresh = useCallback(() => api('/auth/me').then(setMe, () => setMe({ user: null })), []);
    useEffect(() => {
        refresh();
    }, [refresh]);

    function toggleLang() {
        const next = lang === 'he' ? 'en' : 'he';
        setLang(next);
        try {
            localStorage.setItem('sales_lang', next);
        } catch {}
    }

    const value = { t, lang, me, refresh, status };
    const dir = lang === 'he' ? 'rtl' : 'ltr';

    let body;
    if (me === undefined) body = <p className="p-8 text-slate-500">{t.loading}</p>;
    else if (status && !status.database) body = <SetupNeeded />;
    else if (!me.user) body = <AuthForm />;
    else if (!me.business) body = <Onboarding />;
    else body = children;

    return (
        <SalesContext.Provider value={value}>
            <div dir={dir} lang={lang} className="min-h-screen bg-slate-50 font-hebrew text-slate-900">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                        <Link href="/sales" className="text-lg font-bold no-underline">
                            📞 {t.appName}
                        </Link>
                        {me?.business && <span className="text-sm text-slate-500">{me.business.name}</span>}
                        <div className="ms-auto flex items-center gap-3 text-sm">
                            <StatusDots />
                            <button onClick={toggleLang} className="rounded border border-slate-300 px-2 py-1">
                                {t.language}
                            </button>
                            {me?.user && (
                                <button
                                    className="rounded border border-slate-300 px-2 py-1"
                                    onClick={async () => {
                                        await api('/auth/logout', { method: 'POST' });
                                        refresh();
                                    }}
                                >
                                    {t.signOut}
                                </button>
                            )}
                        </div>
                    </div>
                    {me?.business && <Nav t={t} />}
                </header>
                <main className="mx-auto max-w-6xl px-4 py-6">{body}</main>
            </div>
        </SalesContext.Provider>
    );
}

function Nav({ t }) {
    const pathname = usePathname();
    return (
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2">
            {NAV.map((key) => {
                const href = HREF[key] ?? `/sales/${key}`;
                const active = key === 'dashboard' ? pathname === '/sales' : pathname.startsWith(href);
                return (
                    <Link
                        key={key}
                        href={href}
                        className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm no-underline ${
                            active ? 'border-teal-600 font-semibold text-teal-800' : 'border-transparent text-slate-600'
                        }`}
                    >
                        {t.nav[key]}
                    </Link>
                );
            })}
        </nav>
    );
}

function StatusDots() {
    const { t, status } = useSales();
    if (!status) return null;
    const items = [
        ['db', status.database],
        ['ai', status.ai],
        ['telephony', status.telephony]
    ];
    return (
        <span className="hidden items-center gap-2 sm:flex">
            {items.map(([key, ok]) => (
                <span key={key} title={ok ? '' : t.setup.notConfigured} className="flex items-center gap-1 text-xs">
                    <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {t.setup[key]}
                </span>
            ))}
        </span>
    );
}

function SetupNeeded() {
    const { t } = useSales();
    return (
        <Card>
            <h2 className="mb-2 text-xl font-bold">{t.setup.missing}: {t.setup.db}</h2>
            <p className="text-slate-600">DATABASE_URL — {t.setup.notConfigured}</p>
        </Card>
    );
}

function AuthForm() {
    const { t, refresh } = useSales();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await api(mode === 'login' ? '/auth/login' : '/auth/signup', { method: 'POST', body: form });
            await refresh();
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card className="mx-auto max-w-sm">
            <form onSubmit={submit} className="space-y-3">
                <h2 className="text-xl font-bold">{mode === 'login' ? t.signIn : t.signUp}</h2>
                {mode === 'signup' && (
                    <Field label={t.name}>
                        <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </Field>
                )}
                <Field label={t.email}>
                    <input className={INPUT} type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
                <Field label={t.password}>
                    <input className={INPUT} type="password" dir="ltr" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </Field>
                {error && <ErrorLine error={error} />}
                <button className={BUTTON} disabled={busy}>
                    {mode === 'login' ? t.signIn : t.signUp}
                </button>
                <button type="button" className="block text-sm text-teal-700 underline" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                    {mode === 'login' ? t.noAccount : t.haveAccount}
                </button>
            </form>
        </Card>
    );
}

function Onboarding() {
    const { t, refresh } = useSales();
    const [name, setName] = useState('');
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function run(fn) {
        setBusy(true);
        setError(null);
        try {
            await fn();
            await refresh();
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card className="mx-auto max-w-xl space-y-4">
            <h2 className="text-xl font-bold">{t.onboardingTitle}</h2>
            <p className="text-slate-600">{t.onboardingText}</p>
            <button className={BUTTON} disabled={busy} onClick={() => run(() => api('/business/example', { method: 'POST' }))}>
                {t.useExample}
            </button>
            <form
                className="flex flex-wrap items-end gap-2 border-t border-slate-200 pt-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    run(() => api('/business', { method: 'POST', body: { name } }));
                }}
            >
                <Field label={t.settings.name} className="flex-1">
                    <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
                <button className={BUTTON_SECONDARY} disabled={busy}>
                    {t.startBlank}
                </button>
            </form>
            {error && <ErrorLine error={error} />}
        </Card>
    );
}

// --- Small shared UI pieces --------------------------------------------------

export const INPUT = 'w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none';
export const BUTTON = 'rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50';
export const BUTTON_SECONDARY = 'rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50';

export function Card({ children, className = '' }) {
    return <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}

export function Field({ label, children, className = '' }) {
    return (
        <label className={`block text-sm ${className}`}>
            <span className="mb-1 block text-slate-600">{label}</span>
            {children}
        </label>
    );
}

export function ErrorLine({ error }) {
    const { t } = useSales();
    return <p className="text-sm text-red-700">{errorText(t, error)}</p>;
}

export function formatDate(value, lang) {
    if (!value) return '—';
    return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(value)
    );
}

export function money(value) {
    return value === null || value === undefined ? '—' : `$${Number(value).toFixed(value > 0 && value < 1 ? 3 : 2)}`;
}
