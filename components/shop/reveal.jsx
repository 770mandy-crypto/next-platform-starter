'use client';

import { useEffect, useRef, useState } from 'react';

export function Reveal({ children, as: Tag = 'div', delay = 0, mask = false, className = '', once = true, ...rest }) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return undefined;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setInView(true);
                        if (once) observer.unobserve(entry.target);
                    } else if (!once) {
                        setInView(false);
                    }
                }
            },
            { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [once]);

    // The clip-path variant keeps its mask on an inner layer: Chromium's
    // IntersectionObserver reports a fully clip-path'd element as never
    // intersecting, so masking the observed node would freeze it hidden.
    if (mask) {
        return (
            <Tag ref={ref} className={className} {...rest}>
                <div
                    style={{ transitionDelay: `${delay}ms` }}
                    className={`reveal-mask absolute inset-0 ${inView ? 'is-in' : ''}`}
                >
                    {children}
                </div>
            </Tag>
        );
    }

    return (
        <Tag
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={`reveal ${inView ? 'is-in' : ''} ${className}`}
            {...rest}
        >
            {children}
        </Tag>
    );
}

/** Splits a line into words that rise into place one after another. */
export function RevealWords({ text, className = '', delay = 0, wordDelay = 70 }) {
    return (
        <span className={`inline-flex flex-wrap gap-x-[0.28em] ${className}`}>
            {text.split(' ').map((word, index) => (
                <span key={`${word}-${index}`} className="inline-block overflow-hidden">
                    <span
                        className="inline-block animate-in-up"
                        style={{ animationDelay: `${delay + index * wordDelay}ms` }}
                    >
                        {word}
                    </span>
                </span>
            ))}
        </span>
    );
}
