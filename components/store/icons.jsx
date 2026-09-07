const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconBag(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <path d="M5.5 8h13l-1 12h-11L5.5 8Z" />
            <path d="M9.2 8V6.4a2.8 2.8 0 0 1 5.6 0V8" />
        </svg>
    );
}

export function IconHeart({ filled = false, ...props }) {
    return (
        <svg viewBox="0 0 24 24" {...base} fill={filled ? 'currentColor' : 'none'} {...props}>
            <path d="M12 20s-7-4.3-7-9.1A3.7 3.7 0 0 1 12 8.1a3.7 3.7 0 0 1 7 2.8C19 15.7 12 20 12 20Z" />
        </svg>
    );
}

export function IconSearch(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <circle cx="11" cy="11" r="6.3" />
            <path d="m16 16 4.2 4.2" />
        </svg>
    );
}

export function IconClose(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <path d="m6 6 12 12M18 6 6 18" />
        </svg>
    );
}

export function IconMenu(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
    );
}

export function IconArrow(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <path d="M4 12h15" />
            <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
        </svg>
    );
}

export function IconGlobe(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <circle cx="12" cy="12" r="8.4" />
            <path d="M3.6 12h16.8M12 3.6c2 2.4 3 5.2 3 8.4s-1 6-3 8.4c-2-2.4-3-5.2-3-8.4s1-6 3-8.4Z" />
        </svg>
    );
}

export function IconMinus(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <path d="M6 12h12" />
        </svg>
    );
}

export function IconPlus(props) {
    return (
        <svg viewBox="0 0 24 24" {...base} {...props}>
            <path d="M12 6v12M6 12h12" />
        </svg>
    );
}
