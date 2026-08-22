'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch('/api/auth/me');
                if (!res.ok) {
                    router.push('/auth/signin');
                    return;
                }
                const data = await res.json();
                setUser(data.user);

                // Fetch orders for this user
                const ordersRes = await fetch(`/api/orders?userId=${data.user.id}`);
                if (ordersRes.ok) {
                    const ordersData = await ordersRes.json();
                    setOrders(ordersData.orders || []);
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                router.push('/auth/signin');
            } finally {
                setLoading(false);
            }
        }

        checkAuth();
    }, [router]);

    async function handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/');
        } catch (err) {
            setError('Logout failed');
        }
    }

    if (loading) {
        return (
            <div className="px-6 py-16 mx-auto max-w-2xl sm:px-10 sm:py-24">
                <p className="text-muted">טוען...</p>
            </div>
        );
    }

    return (
        <div className="px-6 py-16 mx-auto max-w-2xl sm:px-10 sm:py-24">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">ההזמנות שלי</h1>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm bg-ink border border-gold text-gold rounded hover:bg-gold hover:text-ink transition-colors"
                >
                    התנתקות
                </button>
            </div>

            {user && (
                <div className="mb-8 p-4 bg-ink-2 rounded border border-hairline">
                    <p className="text-sm text-muted mb-1">משתמש:</p>
                    <p className="font-semibold">{user.name || user.email}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                </div>
            )}

            {error && (
                <div className="mb-6 p-3 bg-red-900 text-red-100 rounded text-sm">
                    {error}
                </div>
            )}

            {orders.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted mb-4">אין לך הזמנות עדיין</p>
                    <Link href="/shop" className="text-gold hover:underline">
                        חזור לחנות
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            href={`/account/orders/${order.id}`}
                            className="block p-4 bg-ink-2 border border-hairline rounded hover:border-gold transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-semibold">הזמנה #{order.id}</p>
                                    <p className="text-sm text-muted">{new Date(order.createdAt).toLocaleDateString('he-IL')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gold">₪{order.total}</p>
                                    <p className="text-sm text-muted capitalize">{order.status}</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted">{order.itemCount} פריטים</p>
                        </Link>
                    ))}
                </div>
            )}

            <div className="mt-8 pt-8 border-t border-hairline text-center">
                <Link href="/shop" className="text-gold hover:underline">
                    חזור לחנות
                </Link>
            </div>
        </div>
    );
}
