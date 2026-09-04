'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal plumbing shared by the bag drawer, the quick view and the mobile menu:
 * move focus in on open, keep Tab inside while open, and hand focus back to
 * whatever opened it on close. Returns the ref to put on the dialog element.
 */
export function useDialog(open, onClose) {
    const ref = useRef(null);
    const restoreTo = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        restoreTo.current = document.activeElement;
        const node = ref.current;
        // Focus the first control rather than the panel itself so screen
        // readers land on something actionable.
        const first = node?.querySelector(FOCUSABLE);
        (first ?? node)?.focus?.({ preventScroll: true });

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose();
                return;
            }
            if (event.key !== 'Tab' || !node) return;

            const items = [...node.querySelectorAll(FOCUSABLE)].filter(
                (el) => el.offsetParent !== null || el === document.activeElement
            );
            if (items.length === 0) return;

            const firstItem = items[0];
            const lastItem = items[items.length - 1];
            if (event.shiftKey && document.activeElement === firstItem) {
                event.preventDefault();
                lastItem.focus();
            } else if (!event.shiftKey && document.activeElement === lastItem) {
                event.preventDefault();
                firstItem.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            const target = restoreTo.current;
            if (target instanceof HTMLElement && document.contains(target)) {
                target.focus({ preventScroll: true });
            }
        };
    }, [open, onClose]);

    return ref;
}
