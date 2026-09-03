'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
    const router = useRouter();

    const onClick = async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        router.push('/admin/login');
        router.refresh();
    };

    return (
        <button onClick={onClick} className="bg-neutral-200 text-neutral-900 rounded-sm px-4 py-2">
            התנתק
        </button>
    );
}
