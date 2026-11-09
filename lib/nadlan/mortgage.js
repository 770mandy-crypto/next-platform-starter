// Mortgage math for buyers in Israel. Simplified on purpose: one track at a
// fixed annual rate (a real mortgage mixes tracks), no purchase tax, lawyer or
// agent fees. The financing limits follow the Bank of Israel rules: the loan
// may be at most 75% of the price for a first apartment, 70% for someone
// replacing their home, and 50% for an investment apartment; the monthly
// payment may not exceed 50% of net income (banks usually want about a third).

export const BUYER_TYPES = {
    first: { label: 'דירה ראשונה', maxLtv: 0.75 },
    upgrader: { label: 'משפרי דיור', maxLtv: 0.7 },
    investor: { label: 'דירה להשקעה', maxLtv: 0.5 }
};

export const DEFAULTS = { rate: 4.8, years: 25, paymentShare: 0.33 };
export const MAX_PAYMENT_SHARE = 0.5;
export const MAX_YEARS = 30;

// Monthly payment of an annuity (שפיצר) loan.
export function monthlyPayment(principal, ratePct, years) {
    if (!(principal > 0)) return 0;
    const n = Math.round(years * 12);
    const r = ratePct / 100 / 12;
    if (r === 0) return principal / n;
    return (principal * r) / (1 - (1 + r) ** -n);
}

// The largest loan a monthly payment can carry.
export function loanForPayment(payment, ratePct, years) {
    if (!(payment > 0)) return 0;
    const n = Math.round(years * 12);
    const r = ratePct / 100 / 12;
    if (r === 0) return payment * n;
    return (payment * (1 - (1 + r) ** -n)) / r;
}

const clean = ({ buyerType = 'first', rate = DEFAULTS.rate, years = DEFAULTS.years } = {}) => ({
    type: BUYER_TYPES[buyerType] ? buyerType : 'first',
    rate: Math.min(Math.max(Number(rate) || DEFAULTS.rate, 0), 20),
    years: Math.min(Math.max(Math.round(Number(years) || DEFAULTS.years), 4), MAX_YEARS)
});

// What buying at `price` with `equity` means: loan, financing share, monthly
// payment, and whether it fits the rules (and the income, when given).
export function planPurchase({ price, equity, netIncome, ...opts }) {
    const { type, rate, years } = clean(opts);
    const maxLtv = BUYER_TYPES[type].maxLtv;
    const minEquity = Math.ceil(price * (1 - maxLtv));
    const loan = Math.max(0, price - equity);
    const payment = monthlyPayment(loan, rate, years);
    const share = netIncome > 0 ? payment / netIncome : null;
    const problems = [];
    if (equity < minEquity) problems.push(`חסר הון עצמי: צריך לפחות ${Math.round((1 - maxLtv) * 100)}% מהמחיר (${minEquity.toLocaleString('he-IL')} ₪)`);
    if (share !== null && share > MAX_PAYMENT_SHARE) problems.push('ההחזר החודשי גבוה מחצי מההכנסה, ובנק לא יאשר אותו');
    else if (share !== null && share > DEFAULTS.paymentShare + 0.02) problems.push('ההחזר מעל שליש מההכנסה: בנקים רבים יבקשו יותר הון עצמי או ערבים');
    return {
        buyerType: type,
        rate,
        years,
        price,
        equity,
        loan: Math.round(loan),
        ltv: price > 0 ? Math.round((loan / price) * 1000) / 10 : 0,
        maxLtv: maxLtv * 100,
        minEquity,
        monthlyPayment: Math.round(payment),
        totalPaid: Math.round(payment * years * 12),
        paymentShare: share === null ? null : Math.round(share * 1000) / 10,
        ok: problems.length === 0,
        problems
    };
}

// The most someone can pay for an apartment: limited both by equity (the
// financing cap) and, when income is given, by a monthly payment of about a
// third of net income.
export function affordability({ equity, netIncome, paymentShare = DEFAULTS.paymentShare, ...opts }) {
    const { type, rate, years } = clean(opts);
    const maxLtv = BUYER_TYPES[type].maxLtv;
    const byEquity = equity / (1 - maxLtv);
    const payment = netIncome > 0 ? netIncome * Math.min(paymentShare, MAX_PAYMENT_SHARE) : null;
    const byIncome = payment === null ? Infinity : equity + loanForPayment(payment, rate, years);
    const maxPrice = Math.floor(Math.min(byEquity, byIncome) / 1000) * 1000;
    return {
        buyerType: type,
        rate,
        years,
        maxPrice,
        limitedBy: byIncome < byEquity ? 'income' : 'equity',
        loan: Math.max(0, maxPrice - equity),
        monthlyPayment: Math.round(monthlyPayment(Math.max(0, maxPrice - equity), rate, years))
    };
}
