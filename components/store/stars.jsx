export function Stars({ rating, className }) {
    const rounded = Math.round(rating);
    return (
        <span className={['inline-flex', className].filter(Boolean).join(' ')} aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= rounded ? 'text-yellow-400' : 'text-neutral-300'} aria-hidden="true">
                    ★
                </span>
            ))}
        </span>
    );
}
