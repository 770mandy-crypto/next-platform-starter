'use client';

import { useEffect, useState } from 'react';

export function AnnouncementBar() {
    const [dismissed, setDismissed] = useState(true);

    // Read dismissal only on the client to avoid a hydration mismatch.
    useEffect(() => {
        setDismissed(window.sessionStorage.getItem('yc-announcement-dismissed') === 'true');
    }, []);

    if (dismissed) {
        return null;
    }

    return (
        <div className="relative flex items-center justify-center px-10 py-2 text-sm font-semibold text-center text-primary-content bg-primary">
            <span>
                🎉 Launch sale — up to <strong>53% off</strong> everything. Use code{' '}
                <code className="px-1.5 py-0.5 mx-1 font-mono rounded bg-black/15">LAUNCH</code> at checkout.
            </span>
            <button
                type="button"
                aria-label="Dismiss announcement"
                onClick={() => {
                    window.sessionStorage.setItem('yc-announcement-dismissed', 'true');
                    setDismissed(true);
                }}
                className="absolute -translate-y-1/2 right-3 top-1/2 hover:opacity-70"
            >
                ✕
            </button>
        </div>
    );
}
