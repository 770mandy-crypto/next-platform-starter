export function Sparkline({ values, width = 260, height = 64 }) {
    if (!Array.isArray(values) || values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const points = values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        // SVG y grows downward, so invert the normalised price.
        const y = height - ((value - min) / span) * height;
        return [x, y];
    });

    const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    const rising = values[values.length - 1] >= values[0];
    const color = rising ? '#22c55e' : '#ef4444';
    const gradientId = `spark-${rising ? 'up' : 'down'}`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-16"
            preserveAspectRatio="none"
            role="img"
            aria-label={`גרף מחיר, מגמה ${rising ? 'עולה' : 'יורדת'}`}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}
