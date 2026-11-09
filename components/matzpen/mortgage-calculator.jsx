'use client';

import { useMemo, useState } from 'react';
import { affordability, BUYER_TYPES, DEFAULTS, planPurchase } from 'lib/nadlan/mortgage';
import { formatIls, formatPrice } from './format';

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2';
const num = (v) => Number(String(v).replace(/[^\d.]/g, '')) || 0;

export function MortgageCalculator({ price: initialPrice, title = 'מחשבון משכנתא' }) {
    const thousands = (n) => String(Math.round(n / 1000) * 1000);
    const [price, setPrice] = useState(initialPrice ? thousands(initialPrice) : '');
    const [equity, setEquity] = useState(initialPrice ? thousands(initialPrice * 0.3) : '');
    const [income, setIncome] = useState('');
    const [buyerType, setBuyerType] = useState('first');
    const [rate, setRate] = useState(String(DEFAULTS.rate));
    const [years, setYears] = useState(String(DEFAULTS.years));

    const opts = { buyerType, rate: num(rate), years: num(years) };
    const plan = useMemo(
        () => (num(price) > 0 ? planPurchase({ price: num(price), equity: num(equity), netIncome: num(income) || undefined, ...opts }) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [price, equity, income, buyerType, rate, years]
    );
    const afford = useMemo(
        () => (num(equity) > 0 ? affordability({ equity: num(equity), netIncome: num(income) || undefined, ...opts }) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [equity, income, buyerType, rate, years]
    );

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-black">🏦 {title}</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
                <label className="font-bold">
                    מחיר הדירה (₪)
                    <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={`${field} mt-1 font-normal`} />
                </label>
                <label className="font-bold">
                    הון עצמי (₪)
                    <input inputMode="numeric" value={equity} onChange={(e) => setEquity(e.target.value)} className={`${field} mt-1 font-normal`} />
                </label>
                <label className="font-bold">
                    הכנסה נטו בחודש (₪)
                    <input inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="לא חובה" className={`${field} mt-1 font-normal`} />
                </label>
                <label className="font-bold">
                    סוג רוכש
                    <select value={buyerType} onChange={(e) => setBuyerType(e.target.value)} className={`${field} mt-1 font-normal`}>
                        {Object.entries(BUYER_TYPES).map(([id, t]) => (
                            <option key={id} value={id}>
                                {t.label} (עד {Math.round(t.maxLtv * 100)}% מימון)
                            </option>
                        ))}
                    </select>
                </label>
                <label className="font-bold">
                    ריבית שנתית (%)
                    <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className={`${field} mt-1 font-normal`} />
                </label>
                <label className="font-bold">
                    שנים
                    <input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} className={`${field} mt-1 font-normal`} />
                </label>
            </div>

            {plan && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                    <Box label="החזר חודשי" value={formatIls(plan.monthlyPayment)} strong />
                    <Box label="סכום המשכנתא" value={formatPrice(plan.loan)} />
                    <Box label="אחוז מימון" value={`${plan.ltv}%`} />
                    <Box label="מההכנסה" value={plan.paymentShare === null ? '—' : `${plan.paymentShare}%`} />
                </div>
            )}
            {plan && (
                <div className="mt-3 space-y-1 text-sm">
                    {plan.ok ? (
                        <p className="text-emerald-700">✓ בגבולות שבנק ישראל מאפשר{plan.paymentShare === null ? ' (הוסיפו הכנסה כדי לבדוק גם את ההחזר)' : ''}.</p>
                    ) : (
                        plan.problems.map((p) => (
                            <p key={p} className="text-rose-700">
                                ⚠️ {p}
                            </p>
                        ))
                    )}
                    <p className="text-slate-500">סך הכל תחזירו בערך {formatPrice(plan.totalPaid)} לאורך {plan.years} שנה.</p>
                </div>
            )}
            {afford && (
                <p className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                    עם ההון העצמי {num(income) ? 'וההכנסה ' : ''}האלה אפשר לקנות דירה עד <b>{formatPrice(afford.maxPrice)}</b>
                    {afford.limitedBy === 'income' ? ' (מוגבל לפי ההכנסה, בהחזר של בערך שליש ממנה)' : ' (מוגבל לפי ההון העצמי)'}.
                </p>
            )}
            <p className="mt-3 text-xs text-slate-500">
                הערכה בלבד, במסלול אחד בריבית קבועה. לא כולל מס רכישה, עורך דין ותיווך. הריבית בפועל תלויה בבנק ובתמהיל: בדקו מול יועץ משכנתאות.
            </p>
        </section>
    );
}

function Box({ label, value, strong }) {
    return (
        <div className={`rounded-xl p-2 ${strong ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>
            <div className={strong ? 'text-indigo-100' : 'text-slate-500'}>{label}</div>
            <div className="font-black">{value}</div>
        </div>
    );
}
