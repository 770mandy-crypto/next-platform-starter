'use client';

import { useEffect, useRef, useState } from 'react';

/** Scroll reveal. The observed node stays visible; only its inner layer moves. */
export function Rise({ children, delay = 0, className = '', as: Tag = 'div' }) {
    const ref = useRef(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        if (typeof IntersectionObserver === 'undefined') {
            setShown(true);
            return undefined;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag ref={ref} className={className}>
            <div className={`rise ${shown ? 'in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
                {children}
            </div>
        </Tag>
    );
}
