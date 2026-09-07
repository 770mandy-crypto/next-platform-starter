'use client';

import { useEffect, useRef } from 'react';

/**
 * Focus management for an overlay: move focus in on open, keep Tab inside, and
 * hand focus back to whatever opened it on close.
 */
export function useDialog(open, onClose) {
    const ref = useRef(null);
    const opener = useRef(null);

    useEffect(() => {
        if (!open) {
            opener.current?.focus?.();
            opener.current = null;
            return undefined;
        }

        opener.current = document.activeElement;
        const node = ref.current;
        if (!node) return undefined;

        const focusable = () =>
            [...node.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')]
                .filter((el) => el.offsetParent !== null);

        focusable()[0]?.focus() ?? node.focus();

        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose?.();
                return;
            }
            if (event.key !== 'Tab') return;
            const items = focusable();
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return ref;
}
