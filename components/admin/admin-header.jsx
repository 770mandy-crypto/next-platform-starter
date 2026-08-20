'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Products', href: '/admin/products' },
    { label: 'Orders', href: '/admin/orders' }
];

export function AdminHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch('/api/admin/me');
                if (!res.ok) {
                    router.push('/admin/login');
                    return;
                }
                setIsAuthenticated(true);
            } catch (err) {
                router.push('/admin/login');
            } finally {
                setLoading(false);
            }
        }

        checkAuth();
    }, [router]);

    async function handleLogout() {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            router.push('/admin/login');
        } catch (err) {
            console.error('Logout failed:', err);
        }
    }

    if (loading || !isAuthenticated) {
        return null;
    }

    return (
        <aside className="w-64 border-r border-hairline" style={{ background: 'var(--color-ink-2)' }}>
            <div className="p-6 border-b border-hairline">
                <h1 className="text-xl font-bold text-bone">Admin Panel</h1>
                <p className="text-xs text-muted">VALENTOS Management</p>
            </div>

            <nav className="p-4">
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className="block px-4 py-2 rounded transition-colors"
                                style={{
                                    background: pathname === item.href ? 'var(--color-gold)' : 'transparent',
                                    color: pathname === item.href ? 'var(--color-ink)' : 'var(--color-bone)'
                                }}
                            >
                                {item.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-hairline">
                <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-sm text-bone bg-ink border border-hairline rounded hover:bg-hairline transition-colors"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}
