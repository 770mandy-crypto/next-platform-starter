'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from './api';
import { ItemCard } from './item-card';
import { useSession } from './session';

export function MyItems() {
    const { user } = useSession();
    const [items, setItems] = useState(null);

    useEffect(() => {
        if (user)
            api('/items?mine=1').then(
                (r) => setItems(r.items),
                () => setItems([])
            );
    }, [user]);

    if (user === undefined || (user && !items)) return <p className="opacity-70">טוען…</p>;
    if (!user || items.length === 0) {
        return (
            <div className="flex flex-col items-start gap-3">
                <p className="opacity-80">עוד לא פרסמת כלום למסירה.</p>
                <Link href="/giveback/new" className="btn">
                    ➕ פרסום ראשון
                </Link>
            </div>
        );
    }
    const given = items.filter((i) => i.status === 'given').length;
    return (
        <div className="flex flex-col gap-4">
            {given > 0 && <p className="text-green-200">💚 מסרת כבר {given} פריטים לשכנים. כל הכבוד!</p>}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}
