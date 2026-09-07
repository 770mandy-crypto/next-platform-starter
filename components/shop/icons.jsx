export function IconBag(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" {...props}>
            <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
            <path d="M9.5 8V6.5a2.5 2.5 0 0 1 5 0V8" strokeLinecap="round" />
        </svg>
    );
}

export function IconHeart({ filled = false, ...props }) {
    return (
        <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.3" {...props}>
            <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.6 12 20 12 20Z" strokeLinejoin="round" />
        </svg>
    );
}

export function IconClose(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" {...props}>
            <path d="M6 6l12 12M18 6 6 18" />
        </svg>
    );
}

export function IconRotate(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" {...props}>
            <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9M20.5 12a8.5 8.5 0 0 1-14.6 5.9" />
            <path d="M18 2.6v3.9h-3.9M6 21.4v-3.9h3.9" strokeLinejoin="round" />
        </svg>
    );
}

export function IconArrow({ flip = false, ...props }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={flip ? { transform: 'scaleX(-1)' } : undefined}
            {...props}
        >
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

export function IconStar(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6L12 3Z" />
        </svg>
    );
}

export function IconMenu(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" {...props}>
            <path d="M4 8h16M4 16h16" />
        </svg>
    );
}

export function IconGlobe(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" {...props}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5ZM3.8 9.4h16.4M3.8 14.6h16.4" />
        </svg>
    );
}

export function IconSearch(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" {...props}>
            <circle cx="11" cy="11" r="6.4" />
            <path d="m16 16 4 4" />
        </svg>
    );
}
