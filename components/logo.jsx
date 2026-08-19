export function Logo({ className = '' }) {
    return (
        <span className={`inline-flex items-center gap-2 font-display text-2xl tracking-wide ${className}`}>
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 shrink-0" aria-hidden="true">
                <path
                    d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
                    fill="var(--color-primary)"
                    stroke="var(--color-secondary)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                />
            </svg>
            IGNITE
        </span>
    );
}
