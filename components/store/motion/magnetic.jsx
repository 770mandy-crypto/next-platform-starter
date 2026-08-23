'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/*
Pointer flourishes for the gold buttons: the button leans a few pixels toward
the cursor, and a light sweeps across it on hover.

Mounted once in the store layout and re-bound on navigation rather than wrapping
every button, so markup stays clean. Fine pointers only — a magnetic pull means
nothing to a finger — and it sits out entirely for reduced motion.
*/
const SELECTOR = '.btn-gold';

export function Magnetic() {
    const pathname = usePathname();

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        const cleanups = [];

        // Buttons can mount after this effect (cart lines, async panels), so
        // rebind whenever the subtree changes.
        const bind = () => {
            document.querySelectorAll(SELECTOR).forEach((btn) => {
                if (btn.dataset.magnetic) return;
                btn.dataset.magnetic = '1';

                const onMove = (event) => {
                    const rect = btn.getBoundingClientRect();
                    const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
                    const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
                    btn.style.transform = `translate(${(dx * 9).toFixed(1)}px, ${(dy * 6 - 2).toFixed(1)}px)`;
                };
                const onLeave = () => {
                    btn.style.transform = '';
                };

                btn.addEventListener('pointermove', onMove);
                btn.addEventListener('pointerleave', onLeave);
                cleanups.push(() => {
                    btn.removeEventListener('pointermove', onMove);
                    btn.removeEventListener('pointerleave', onLeave);
                    delete btn.dataset.magnetic;
                    btn.style.transform = '';
                });
            });
        };

        bind();
        const observer = new MutationObserver(bind);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            cleanups.forEach((off) => off());
        };
    }, [pathname]);

    return null;
}
