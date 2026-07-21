export function ProductThumbnail({ emoji, gradient, className, size = 'text-6xl' }) {
    const [from, to] = gradient ?? ['#2bdcd2', '#016968'];
    return (
        <div
            className={['flex items-center justify-center rounded-sm', className].filter(Boolean).join(' ')}
            style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
            aria-hidden="true"
        >
            <span className={size} style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}>
                {emoji}
            </span>
        </div>
    );
}

export function formatPrice(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
