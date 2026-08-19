const words = ['כוח', 'HIIT', 'סיבולת', 'יוגה', 'קרדיו', 'גמישות', 'ליבה וברזל', 'תזונה', 'שיקום וניידות', 'בוקסינג'];

export function Marquee() {
    const items = [...words, ...words];

    return (
        <div className="py-6 overflow-hidden border-y marquee-wrap border-edge bg-surface/60">
            <div className="marquee-track">
                {[...items, ...items].map((word, index) => (
                    <span
                        key={`${word}-${index}`}
                        className="flex items-center gap-3 px-8 font-display text-2xl tracking-wide whitespace-nowrap text-neutral-400"
                    >
                        {word}
                        <span className="text-primary" aria-hidden="true">
                            ✦
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}
