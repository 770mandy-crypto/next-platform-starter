'use client';

import { useEffect, useRef } from 'react';

/*
Heading reveal.

Each word gets its own overflow-hidden box and slides up out of it, staggered
left to right. The words are in the DOM as plain text from the server, so the
heading is fully readable to crawlers and to anyone whose JS never runs; the
masking classes are only attached on mount, and skipped entirely for reduced
motion.
*/
export function SplitHeading({ children, as: Tag = 'h1', className = '', delay = 0, stagger = 70 }) {
    const ref = useRef(null);

    useEffect(() => {
        const node = ref.current;
        if (!node || typeof children !== 'string') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const words = children.split(' ');
        node.textContent = '';

        const masks = words.map((word, index) => {
            const mask = document.createElement('span');
            mask.className = 'word-mask';

            const inner = document.createElement('span');
            inner.textContent = word;
            inner.style.setProperty('--word-delay', `${delay + index * stagger}ms`);

            mask.appendChild(inner);
            node.appendChild(mask);
            if (index < words.length - 1) {
                node.appendChild(document.createTextNode(' '));
            }
            return mask;
        });

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    masks.forEach((mask) => mask.classList.add('is-in'));
                    observer.disconnect();
                }
            },
            { threshold: 0.2 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [children, delay, stagger]);

    return (
        <Tag ref={ref} className={className}>
            {children}
        </Tag>
    );
}
