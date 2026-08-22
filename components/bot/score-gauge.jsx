const TONE_COLORS = {
    'strong-buy': '#22c55e',
    buy: '#84cc16',
    hold: '#eab308',
    sell: '#f97316',
    'strong-sell': '#ef4444'
};

export function ScoreGauge({ score, verdict, tone, label, size = 132 }) {
    const stroke = 10;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
    const color = TONE_COLORS[tone] || '#2bdcd2';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`ציון ${safeScore} מתוך 100`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth={stroke}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - safeScore / 100)}
                        className="transition-[stroke-dashoffset] duration-700"
                    />
                </svg>
                {/* Scale the label with the ring so small gauges don't clip. */}
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
                    <span className="font-bold tabular-nums" style={{ fontSize: size * 0.24 }}>
                        {Number.isFinite(score) ? score : '—'}
                    </span>
                    <span className="opacity-60" style={{ fontSize: Math.max(8, size * 0.095) }}>
                        מתוך 100
                    </span>
                </div>
            </div>
            {verdict && (
                <span className="px-3 py-1 text-sm font-bold rounded-full" style={{ backgroundColor: color, color: '#0b1b3a' }}>
                    {verdict}
                </span>
            )}
            {label && <span className="text-xs opacity-70">{label}</span>}
        </div>
    );
}
