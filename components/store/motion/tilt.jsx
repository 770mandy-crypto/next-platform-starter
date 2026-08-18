'use client';

import { useEffect, useRef } from 'react';

/*
Pointer-reactive 3D tilt with a gold glare that tracks the cursor.

Reads are batched into a rAF frame so a fast pointer cannot queue up layout work,
and the whole thing is skipped on coarse pointers (no hover to respond to) and
under reduced motion.
*/
export function Tilt({ children, className = '', max = 7, scale = 1.015, glare = true }) {
    const hostRef = useRef(null);
    const innerRef = useRef(null);

    useEffect(() => {
        const host = hostRef.current;
        const inner = innerRef.current;
        if (!host || !inner) return;

        const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!fine || still) return;

        let frame = 0;
        let pending = null;

        function apply() {
            frame = 0;
            if (!pending) return;
            const { x, y } = pending;
            const rect = host.getBoundingClientRect();
            const px = (x - rect.left) / rect.width;
            const py = (y - rect.top) / rect.height;

            inner.style.transform =
                `perspective(1100px) rotateY(${(px - 0.5) * max * 2}deg) ` +
                `rotateX(${(0.5 - py) * max * 2}deg) scale(${scale})`;

            host.style.setProperty('--gx', `${px * 100}%`);
            host.style.setProperty('--gy', `${py * 100}%`);
        }

        function onMove(event) {
            pending = { x: event.clientX, y: event.clientY };
            if (!frame) frame = window.requestAnimationFrame(apply);
        }

        function onLeave() {
            if (frame) window.cancelAnimationFrame(frame);
            frame = 0;
            pending = null;
            inner.style.transform = '';
        }

        host.addEventListener('pointermove', onMove);
        host.addEventListener('pointerleave', onLeave);
        return () => {
            host.removeEventListener('pointermove', onMove);
            host.removeEventListener('pointerleave', onLeave);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [max, scale]);

    return (
        <div ref={hostRef} className={`tilt-host relative ${className}`}>
            <div ref={innerRef} className="tilt">
                {children}
                {glare && <span className="tilt-glare" aria-hidden="true" />}
            </div>
        </div>
    );
}
