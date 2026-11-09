import { formatMonth, formatPrice } from './format';

// Several neighborhoods' median price on one chart, over their common months.
export function MultiChart({ series }) {
    const withData = series.filter((s) => s.history?.length > 1);
    if (!withData.length) return <p className="text-sm text-slate-500">אין היסטוריית מחירים להשוואה.</p>;
    const W = 600;
    const H = 220;
    const P = 10;
    const months = [...new Set(withData.flatMap((s) => s.history.map((p) => p.month)))].sort();
    const values = withData.flatMap((s) => s.history.map((p) => p.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const x = (m) => P + (months.indexOf(m) / Math.max(1, months.length - 1)) * (W - 2 * P);
    const y = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
    return (
        <figure>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="השוואת מחירים חציוניים לאורך זמן" preserveAspectRatio="none">
                {withData.map((s) => (
                    <path
                        key={s.id}
                        d={s.history.map((p, i) => `${i ? 'L' : 'M'}${x(p.month).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
            </svg>
            <figcaption dir="ltr" className="mt-1 flex justify-between text-xs text-slate-500">
                <span>{formatMonth(months[0])}</span>
                <span>
                    {formatPrice(min)} – {formatPrice(max)}
                </span>
                <span>{formatMonth(months.at(-1))}</span>
            </figcaption>
        </figure>
    );
}
