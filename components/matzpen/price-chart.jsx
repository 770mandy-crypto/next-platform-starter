import { formatMonth, formatPrice } from './format';

// A small server-rendered line chart of a neighborhood's median price.
export function PriceChart({ history, color = '#4f46e5' }) {
    if (!history || history.length < 2) return <p className="text-sm text-slate-500">אין מספיק נתונים לגרף.</p>;
    const W = 600;
    const H = 180;
    const P = 8;
    const values = history.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const x = (i) => P + (i / (history.length - 1)) * (W - 2 * P);
    const y = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
    const line = history.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    const area = `${line} L${x(history.length - 1)},${H} L${x(0)},${H} Z`;
    return (
        <figure>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="גרף מחיר חציוני לאורך זמן" preserveAspectRatio="none">
                <path d={area} fill={color} opacity="0.08" />
                <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <figcaption className="mt-1 flex justify-between text-xs text-slate-500">
                <span>
                    {formatMonth(history[0].month)}: {formatPrice(history[0].value)}
                </span>
                <span>
                    {formatMonth(history.at(-1).month)}: {formatPrice(history.at(-1).value)}
                </span>
            </figcaption>
        </figure>
    );
}
