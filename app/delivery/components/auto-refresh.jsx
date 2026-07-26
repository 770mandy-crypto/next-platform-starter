'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// מרענן את נתוני העמוד כל כמה שניות כדי שהתראות ועדכונים יופיעו אוטומטית
export function AutoRefresh({ seconds = 20 }) {
    const router = useRouter();

    useEffect(() => {
        const id = setInterval(() => router.refresh(), seconds * 1000);
        return () => clearInterval(id);
    }, [router, seconds]);

    return null;
}
