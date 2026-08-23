'use client';

import { useEffect, useRef, useState } from 'react';
import { BrandMark } from 'components/store/brand-mark';

/*
Site-wide motion chrome: the opening curtain, the scroll progress hairline and
the gold cursor. Grouped in one client component so the store layout stays a
server component with a single client boundary.
*/

function prefersStill() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
Opening curtain. Shown once per browser session — a returning shopper clicking
through the site should never sit through it twice.
*/
export function IntroCurtain() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (prefersStill()) return;
        try {
            if (window.sessionStorage.getItem('am-intro') === 'seen') return;
            window.sessionStorage.setItem('am-intro', 'seen');
        } catch {
            // Private mode: play it, just don't remember.
        }
        setShow(true);
        const timer = window.setTimeout(() => setShow(false), 3600);
        return () => window.clearTimeout(timer);
    }, []);

    if (!show) return null;

    return (
        <div className="curtain" aria-hidden="true">
            <div className="flex flex-col items-center curtain-mark">
                <BrandMark scale={1.35} shimmer />
                <span
                    className="block h-px mt-10 curtain-rule"
                    style={{ width: '12rem', background: 'var(--color-gold)' }}
                />
            </div>
        </div>
    );
}

// A gold hairline across the top, tracking how far down the page you are.
export function ScrollProgress() {
    const ref = useRef(null);

    useEffect(() => {
        const bar = ref.current;
        if (!bar) return;

        let frame = 0;
        function update() {
            frame = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const ratio = max > 0 ? window.scrollY / max : 0;
            bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
        }
        function onScroll() {
            if (!frame) frame = window.requestAnimationFrame(update);
        }

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    return (
        <div className="fixed inset-x-0 top-0 z-[60] h-px pointer-events-none" aria-hidden="true">
            <div
                ref={ref}
                className="w-full h-full origin-right"
                style={{
                    transform: 'scaleX(0)',
                    background: 'linear-gradient(90deg, var(--color-gold-lo), var(--color-gold-hi), var(--color-gold))'
                }}
            />
        </div>
    );
}

/*
A gold ring that trails the pointer and opens up over anything interactive.
Desktop-only: coarse pointers have no cursor to replace, and the native one is
left alone under reduced motion.
*/
export function GoldCursor() {
    const ringRef = useRef(null);
    const dotRef = useRef(null);
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!fine || prefersStill()) return;
        setEnabled(true);

        const ring = ringRef.current;
        const dot = dotRef.current;
        if (!ring || !dot) return;

        let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        let ringPos = { ...target };
        let frame;
        // Stay hidden until the pointer actually moves, so the ring never sits
        // parked somewhere the cursor isn't.
        let seenPointer = false;

        function tick() {
            // The dot is exact, the ring lags — that gap is what reads as weight.
            ringPos.x += (target.x - ringPos.x) * 0.18;
            ringPos.y += (target.y - ringPos.y) * 0.18;
            ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
            dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
            frame = window.requestAnimationFrame(tick);
        }

        function onMove(event) {
            target = { x: event.clientX, y: event.clientY };
            if (!seenPointer) {
                seenPointer = true;
                ringPos = { ...target };
                ring.style.opacity = '';
                dot.style.opacity = '';
            }
        }

        function onOver(event) {
            const interactive = event.target.closest('a, button, input, select, textarea, [role="button"]');
            ring.classList.toggle('is-open', Boolean(interactive));
        }

        frame = window.requestAnimationFrame(tick);
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerover', onOver, { passive: true });
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerover', onOver);
        };
    }, []);

    if (!enabled) return null;

    return (
        <>
            <style>{`
                @media (hover: hover) and (pointer: fine) {
                    .store, .store a, .store button { cursor: none; }
                }
                .gold-ring {
                    position: fixed; top: 0; left: 0; z-index: 95;
                    width: 34px; height: 34px; border-radius: 999px;
                    border: 1px solid var(--color-gold);
                    pointer-events: none; opacity: 0.75;
                    transition: width 0.35s ease, height 0.35s ease, opacity 0.35s ease, background-color 0.35s ease;
                }
                .gold-ring.is-open {
                    width: 58px; height: 58px; opacity: 1;
                    background: color-mix(in oklab, var(--color-gold) 12%, transparent);
                }
                .gold-dot {
                    position: fixed; top: 0; left: 0; z-index: 95;
                    width: 4px; height: 4px; border-radius: 999px;
                    background: var(--color-gold-hi);
                    pointer-events: none;
                }
            `}</style>
            <div ref={ringRef} className="gold-ring" style={{ opacity: 0 }} aria-hidden="true" />
            <div ref={dotRef} className="gold-dot" style={{ opacity: 0 }} aria-hidden="true" />
        </>
    );
}
