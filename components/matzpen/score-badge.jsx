export function ScoreBadge({ area, size = 'md' }) {
    const cls = size === 'lg' ? 'h-14 w-14 text-xl' : size === 'xl' ? 'h-20 w-20 text-3xl' : 'h-10 w-10 text-sm';
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-full font-black text-white ${cls}`} style={{ background: area.trend.color }} title="ציון צמיחה">
            {area.score}
        </div>
    );
}
