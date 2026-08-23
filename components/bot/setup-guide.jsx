'use client';

import { useEffect, useState } from 'react';

const STATE_STYLES = {
    ok: 'bg-green-500/15 border-green-400/40',
    missing: 'bg-yellow-500/15 border-yellow-400/40',
    rejected: 'bg-red-500/15 border-red-400/40',
    quota: 'bg-orange-500/15 border-orange-400/40',
    error: 'bg-red-500/15 border-red-400/40'
};

const STATE_ICONS = { ok: '✅', missing: '⚠️', rejected: '❌', quota: '⏳', error: '❌' };

function ProviderCard({ check, required }) {
    return (
        <div className={`flex flex-col gap-2 p-4 border rounded-lg ${STATE_STYLES[check.state]}`}>
            <div className="flex flex-wrap items-baseline gap-2">
                <span>{STATE_ICONS[check.state]}</span>
                <strong>{check.headline}</strong>
                <span className="px-2 py-0.5 text-xs rounded-full bg-white/10">
                    {required ? 'נדרש' : 'רשות'}
                </span>
            </div>
            <p className="text-sm leading-relaxed opacity-90">{check.detail}</p>
            <code className="self-start px-2 py-1 text-xs rounded bg-black/30" dir="ltr">
                {check.key}
            </code>
        </div>
    );
}

export function SetupGuide() {
    const [state, setState] = useState({ status: 'loading' });

    async function check() {
        setState({ status: 'loading' });
        try {
            const response = await fetch('/api/setup-status');
            setState({ status: 'done', payload: await response.json() });
        } catch {
            setState({ status: 'error' });
        }
    }

    useEffect(() => {
        check();
    }, []);

    if (state.status === 'loading') {
        return <div className="p-6 text-center rounded-lg bg-white/5 animate-pulse">בודק את ההגדרות…</div>;
    }
    if (state.status === 'error') {
        return <div className="p-6 rounded-lg bg-red-500/15 border border-red-400/40">לא הצלחתי לבדוק את ההגדרות.</div>;
    }

    const { payload } = state;

    return (
        <div className="flex flex-col gap-6">
            <div
                className={`p-5 border rounded-lg ${
                    payload.ready ? 'bg-green-500/15 border-green-400/40' : 'bg-yellow-500/15 border-yellow-400/40'
                }`}
            >
                <div className="text-lg font-bold">{payload.headline}</div>
                {payload.ready && (
                    <p className="mt-2 text-sm">
                        אפשר לעבור ל
                        <a href="/market" className="text-primary">
                            מפת השוק
                        </a>{' '}
                        או ל
                        <a href="/bot" className="text-primary">
                            אנליסט
                        </a>
                        .
                    </p>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <ProviderCard check={payload.prices} required />
                <ProviderCard check={payload.fundamentals} required={false} />
            </div>

            <button type="button" onClick={check} className="self-start px-5 py-3 font-bold rounded bg-primary text-primary-content">
                בדוק שוב
            </button>

            {!payload.ready && (
                <ol className="flex flex-col gap-3 p-6 text-sm rounded-lg bg-white/5">
                    <li>
                        <strong>1.</strong> היכנס ל-
                        <a href="https://twelvedata.com/pricing" target="_blank" rel="noopener noreferrer" className="text-primary">
                            twelvedata.com
                        </a>{' '}
                        ובחר את המסלול החינמי. ההרשמה דורשת מייל בלבד.
                    </li>
                    <li>
                        <strong>2.</strong> אחרי ההרשמה המפתח מופיע בלוח הבקרה. העתק אותו במלואו.
                    </li>
                    <li>
                        <strong>3.</strong> ב-Netlify: <code dir="ltr">Site configuration → Environment variables → Add a variable</code>
                        {' '}עם השם <code dir="ltr">TWELVEDATA_API_KEY</code>.
                    </li>
                    <li>
                        <strong>4.</strong> בחר <strong>&quot;Same value for all deploy contexts&quot;</strong>. זו הנקודה
                        שהכי מפילה — משתנה שמוגדר ל-Production בלבד פשוט לא קיים ב-Deploy Preview.
                    </li>
                    <li>
                        <strong>5.</strong> <code dir="ltr">Deploys → Trigger deploy → Clear cache and deploy site</code>.
                        משתנה שנוסף אחרי בנייה לא נכנס אליה.
                    </li>
                    <li>
                        <strong>6.</strong> חזור לדף הזה ולחץ &quot;בדוק שוב&quot;.
                    </li>
                </ol>
            )}

            <p className="text-xs opacity-50" dir="ltr">
                Checked {new Date(payload.checkedAt).toLocaleString('he-IL')}
            </p>
        </div>
    );
}
