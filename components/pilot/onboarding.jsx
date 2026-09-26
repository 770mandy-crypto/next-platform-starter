'use client';

import { useState } from 'react';
import { MODULES } from 'lib/pilot/policy';

const FLOW = ['מטרה', 'תוכנית', 'ביצוע', 'תוצאה'];

const EXAMPLES = [
    'להשיק חנות אונליין לתכשיטים בעבודת יד',
    'למצוא עבודה כמפתח/ת Frontend תוך 3 חודשים',
    'ללמוד ספרדית ברמת שיחה',
    'לבנות סטארט-אפ של AI ולגייס 10 לקוחות ראשונים'
];

export function Logo({ size = 'md' }) {
    const box = size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-9 h-9 text-lg';
    return (
        <div className="flex items-center gap-2.5">
            <div className={`${box} grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30`}>
                🧭
            </div>
            <div className="leading-tight">
                <div className={`font-extrabold text-slate-900 ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>מסלול</div>
                <div className="text-[11px] font-medium tracking-wide text-slate-500">Maslul AI</div>
            </div>
        </div>
    );
}

const inputClass =
    'w-full px-3 py-2.5 mt-1 border rounded-lg outline-none border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

function AuthCard({ onSignUp, onLogIn }) {
    const [tab, setTab] = useState('signup');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const signup = tab === 'signup';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const valid = signup ? name.trim() && emailOk && password.length >= 8 && agreed : emailOk && password;

    async function submit(event) {
        event.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError('');
        try {
            if (signup) await onSignUp({ name: name.trim(), email: email.trim(), password });
            else await onLogIn({ email: email.trim(), password });
        } catch (failure) {
            setError(failure.message);
            setBusy(false);
        }
    }

    return (
        <section className="self-start p-6 bg-white border shadow-xl rounded-2xl border-slate-200 shadow-indigo-100 sm:p-8 lg:sticky lg:top-8">
            <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-slate-100">
                {[
                    ['signup', 'הרשמה'],
                    ['login', 'התחברות']
                ].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => {
                            setTab(id);
                            setError('');
                        }}
                        className={`py-2 text-sm font-bold rounded-lg transition ${tab === id ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{signup ? 'פתיחת חשבון' : 'ברוכים השבים'}</h2>
            <p className="mt-1 text-sm text-slate-500">
                {signup ? 'דקה אחת ואתם בפנים. בלי כרטיס אשראי.' : 'הפרויקט, התוכנית והזיכרון מחכים לכם.'}
            </p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
                {signup && (
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">שם</span>
                        <input
                            name="name"
                            autoComplete="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className={inputClass}
                            placeholder="איך לקרוא לך?"
                        />
                    </label>
                )}
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">אימייל</span>
                    <input
                        name="email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={`${inputClass} text-left`}
                        placeholder="you@example.com"
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-semibold text-slate-700">סיסמה</span>
                    <input
                        name="password"
                        type="password"
                        dir="ltr"
                        autoComplete={signup ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={`${inputClass} text-left`}
                        placeholder={signup ? 'לפחות 8 תווים' : ''}
                    />
                </label>
                {signup && (
                    <label className="flex items-start gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            name="agree"
                            checked={agreed}
                            onChange={(event) => setAgreed(event.target.checked)}
                            className="mt-1 accent-indigo-600"
                        />
                        <span>אני מבין/ה שהסוכן לעולם לא מבצע פעולה חיצונית (מייל, יומן, פרסום) בלי אישור שלי.</span>
                    </label>
                )}
                {error && <p className="p-3 text-sm text-red-700 rounded-lg bg-red-50">{error}</p>}
                <button
                    type="submit"
                    disabled={!valid || busy}
                    className="w-full py-3 font-bold text-white transition rounded-xl bg-gradient-to-l from-indigo-600 to-fuchsia-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {busy ? '…' : signup ? 'יוצאים לדרך ←' : 'התחברות ←'}
                </button>
            </form>
            <p className="mt-4 text-xs text-slate-400">
                הסיסמה נשמרת מוצפנת (scrypt), והפרויקט נשמר בחשבון שלך — מכל מכשיר.
            </p>
        </section>
    );
}

export function Landing({ onSignUp, onLogIn }) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
            <header className="flex items-center justify-between max-w-6xl px-4 py-5 mx-auto sm:px-6">
                <Logo />
                <span className="px-3 py-1 text-xs font-semibold text-indigo-700 rounded-full bg-indigo-100">MVP · גרסה 1</span>
            </header>

            <main className="grid max-w-6xl gap-10 px-4 pt-6 pb-16 mx-auto sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:pt-14">
                <section>
                    <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                        מה-AI שעונה על שאלות,
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-600 to-fuchsia-600">
                            ל-AI שמוביל אותך לתוצאה.
                        </span>
                    </h1>
                    <p className="max-w-xl mt-5 text-lg text-slate-600">
                        כותבים מטרה — ומסלול בונה תוכנית, מפרק אותה למשימות, זוכר את הפרויקט, חוקר, כותב ומבצע פעולות. ולפני כל פעולה
                        שיוצאת לעולם — מבקש את האישור שלך.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-7">
                        {FLOW.map((step, index) => (
                            <div key={step} className="flex items-center gap-2">
                                <span className="px-4 py-2 text-sm font-bold bg-white border shadow-sm rounded-xl border-slate-200 text-slate-800">
                                    {step}
                                </span>
                                {index < FLOW.length - 1 && <span className="text-slate-400">←</span>}
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-3 mt-10 sm:grid-cols-2">
                        {Object.values(MODULES).map((module) => (
                            <div key={module.id} className="flex items-center gap-3 p-3 bg-white border rounded-xl border-slate-200">
                                <span className="text-2xl">{module.icon}</span>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">{module.label}</div>
                                    <div className="text-xs text-slate-500">{module.he}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <AuthCard onSignUp={onSignUp} onLogIn={onLogIn} />
            </main>
        </div>
    );
}

export function GoalSetup({ user, onCreate, onLogOut }) {
    const [goal, setGoal] = useState('');
    const [context, setContext] = useState('');
    const [weeks, setWeeks] = useState(6);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function submit(event) {
        event.preventDefault();
        if (!goal.trim()) return;
        setBusy(true);
        setError('');
        try {
            await onCreate({ goal: goal.trim(), context: context.trim(), weeks });
        } catch (failure) {
            setError(failure.message);
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
            <header className="flex items-center justify-between max-w-3xl px-4 py-5 mx-auto sm:px-6">
                <Logo />
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>שלום, {user.name} 👋</span>
                    <button onClick={onLogOut} className="text-xs underline text-slate-400 hover:text-slate-600">
                        התנתקות
                    </button>
                </div>
            </header>
            <main className="max-w-3xl px-4 pt-4 pb-16 mx-auto sm:px-6">
                <div className="text-sm font-bold text-indigo-600">שלב 1 מתוך 4 · מטרה</div>
                <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">מה המטרה שלך?</h1>
                <p className="mt-2 text-slate-600">
                    כתוב/י במשפט אחד מה רוצים להשיג. 📋 ה-Planner יבנה ממנו תוכנית, ו-🧠 ה-Brain יזכור את כל ההקשר.
                </p>

                <form onSubmit={submit} className="p-6 mt-8 space-y-5 bg-white border shadow-sm rounded-2xl border-slate-200">
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">המטרה</span>
                        <textarea
                            name="goal"
                            value={goal}
                            onChange={(event) => setGoal(event.target.value)}
                            rows={2}
                            className="w-full px-3 py-2.5 mt-1 text-lg border rounded-lg outline-none resize-none border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="לדוגמה: להשיק חנות אונליין תוך חודשיים"
                        />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {EXAMPLES.map((example) => (
                            <button
                                type="button"
                                key={example}
                                onClick={() => setGoal(example)}
                                className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">הקשר (לא חובה)</span>
                        <textarea
                            name="context"
                            value={context}
                            onChange={(event) => setContext(event.target.value)}
                            rows={3}
                            className="w-full px-3 py-2.5 mt-1 border rounded-lg outline-none resize-none border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder="מה כבר יש לך? כמה זמן בשבוע? תקציב? מגבלות?"
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">תוך כמה שבועות? <b className="text-indigo-600">{weeks}</b></span>
                        <input
                            type="range"
                            min={1}
                            max={24}
                            value={weeks}
                            onChange={(event) => setWeeks(Number(event.target.value))}
                            className="w-full mt-2 accent-indigo-600"
                        />
                    </label>
                    {error && <p className="p-3 text-sm text-red-700 rounded-lg bg-red-50">{error}</p>}
                    <button
                        type="submit"
                        disabled={!goal.trim() || busy}
                        className="w-full py-3 font-bold text-white transition rounded-xl bg-gradient-to-l from-indigo-600 to-fuchsia-600 hover:opacity-90 disabled:opacity-40"
                    >
                        {busy ? '📋 בונה תוכנית…' : 'בנה לי תוכנית ←'}
                    </button>
                </form>
            </main>
        </div>
    );
}
