'use client';

import { useEffect, useRef, useState } from 'react';

export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            className={`reveal ${inView ? 'in-view' : ''} ${className}`}
            style={{ '--reveal-delay': `${delay}ms` }}
        >
            {children}
        </Tag>
    );
}
