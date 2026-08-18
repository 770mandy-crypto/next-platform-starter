'use client';

import { useEffect, useRef } from 'react';

/*
Scroll-reveal.

Elements ship in their finished state in the HTML and only get the `reveal`
class once this mounts, so the content is never hidden for anyone whose JS fails
or who prefers reduced motion — for them nothing is ever added and the page is
simply static.

Each revealed element unobserves itself after firing, so scrolling back up does
not replay the animation.
*/
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }) {
    const ref = useRef(null);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        node.style.setProperty('--reveal-delay', `${delay}ms`);
        node.classList.add('reveal');

        // Anything already on screen at mount reveals immediately rather than
        // waiting for a scroll that may never come on a short page.
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-in');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [delay]);

    return (
        <Tag ref={ref} className={className}>
            {children}
        </Tag>
    );
}
