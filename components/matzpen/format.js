export const formatIls = (n) => (Number.isFinite(n) ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—');

// Millions with one decimal for big prices: ₪2.4M → "2.4 מיליון ₪"
export const formatPrice = (n) => {
    if (!Number.isFinite(n)) return '—';
    if (n >= 1_000_000) return `${parseFloat((n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2))} מיליון ₪`;
    return formatIls(n);
};

// Wrapped in a left-to-right isolate so "+8.2%" does not flip in Hebrew text.
export const ltr = (text) => `\u2066${text}\u2069`;
export const formatPct = (n) => (Number.isFinite(n) ? ltr(`${n > 0 ? '+' : ''}${n}%`) : '—');

export const formatMonth = (m) => {
    if (!m) return '—';
    const [y, mo] = m.split('-');
    return `${mo}/${y}`;
};

export const SIGNAL_ICONS = { transport: '🚆', renewal: '🏗️', development: '🌳', employment: '💼' };

export const PART_LABELS = {
    momentum: 'מגמת מחיר (שנה)',
    longTerm: 'מגמת מחיר (3 שנים)',
    gap: 'זול מהחציון בעיר',
    yield: 'תשואה משכירות',
    signals: 'מנועי צמיחה',
    risks: 'סיכונים'
};

// Strips what map and list pages do not need, to keep the page payload small.
export const lean = ({ history, ...area }) => area;
