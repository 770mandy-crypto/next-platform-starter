/*
An endless band of brand words. The track holds the items twice and translates
by exactly 50%, so the loop has no seam and no JS.
*/
export function Marquee({ items, duration = 34 }) {
    const run = (key) => (
        <div className="marquee-track" key={key} aria-hidden={key === 'b' ? 'true' : undefined}>
            {items.map((item, index) => (
                <span
                    key={`${key}-${index}`}
                    className="flex items-center gap-12 text-sm tracking-[0.34em] uppercase whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-display)' }}
                >
                    <span className="gold-leaf">{item}</span>
                    <span aria-hidden="true" style={{ color: 'var(--color-hairline)' }}>
                        ◆
                    </span>
                </span>
            ))}
        </div>
    );

    return (
        <div className="py-6 border-y marquee hairline" style={{ '--marquee-duration': `${duration}s` }}>
            {run('a')}
            {run('b')}
        </div>
    );
}
