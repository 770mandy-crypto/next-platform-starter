'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalProducts: 0,
        totalUsers: 0,
        recentOrders: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/admin/stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-bone mb-8">Dashboard</h1>

            {loading ? (
                <p className="text-muted">Loading...</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-6 rounded border border-hairline" style={{ background: 'var(--color-ink-2)' }}>
                            <p className="text-muted text-sm mb-2">Total Orders</p>
                            <p className="text-4xl font-bold text-gold">{stats.totalOrders}</p>
                        </div>

                        <div className="p-6 rounded border border-hairline" style={{ background: 'var(--color-ink-2)' }}>
                            <p className="text-muted text-sm mb-2">Total Products</p>
                            <p className="text-4xl font-bold text-gold">{stats.totalProducts}</p>
                        </div>

                        <div className="p-6 rounded border border-hairline" style={{ background: 'var(--color-ink-2)' }}>
                            <p className="text-muted text-sm mb-2">Total Users</p>
                            <p className="text-4xl font-bold text-gold">{stats.totalUsers}</p>
                        </div>
                    </div>

                    <div className="rounded border border-hairline p-6" style={{ background: 'var(--color-ink-2)' }}>
                        <h2 className="text-xl font-bold text-bone mb-4">Recent Orders</h2>
                        {stats.recentOrders.length === 0 ? (
                            <p className="text-muted">No orders yet</p>
                        ) : (
                            <table className="w-full text-sm text-bone">
                                <thead>
                                    <tr className="border-b border-hairline">
                                        <th className="text-left py-2">Order ID</th>
                                        <th className="text-left py-2">Customer</th>
                                        <th className="text-left py-2">Total</th>
                                        <th className="text-left py-2">Status</th>
                                        <th className="text-left py-2">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentOrders.map((order) => (
                                        <tr key={order.id} className="border-b border-hairline hover:bg-ink transition-colors">
                                            <td className="py-3">{order.id}</td>
                                            <td className="py-3">{order.customer}</td>
                                            <td className="py-3">₪{order.total}</td>
                                            <td className="py-3">
                                                <span
                                                    className="px-2 py-1 rounded text-xs font-semibold"
                                                    style={{
                                                        background: order.status === 'paid' ? '#16a34a' : '#dc2626',
                                                        color: 'white'
                                                    }}
                                                >
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="py-3">{new Date(order.date).toLocaleDateString('he-IL')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
