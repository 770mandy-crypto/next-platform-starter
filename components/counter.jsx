'use client';

import { useEffect, useRef, useState } from 'react';

export function Counter({ to, duration = 1600, prefix = '', suffix = '', decimals = 0 }) {
    const ref = useRef(null);
    const [value, setValue] = useState(0);
    const started = useRef(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const start = performance.now();

                    const tick = (now) => {
                        const progress = Math.min((now - start) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setValue(to * eased);
                        if (progress < 1) requestAnimationFrame(tick);
                        else setValue(to);
                    };

                    requestAnimationFrame(tick);
                    observer.disconnect();
                }
            },
            { threshold: 0.4 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [to, duration]);

    return (
        <span ref={ref} dir="ltr" className="inline-block">
            {prefix}
            {value.toLocaleString('he-IL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
            {suffix}
        </span>
    );
}
