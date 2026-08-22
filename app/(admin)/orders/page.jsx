'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchOrders();
    }, [filter]);

    async function fetchOrders() {
        try {
            const res = await fetch(`/api/admin/orders?status=${filter}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(orderId, newStatus) {
        try {
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to update order:', err);
        }
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-bone mb-8">Orders</h1>

            <div className="mb-6 flex gap-4">
                {['all', 'pending', 'paid', 'refunded'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className="px-4 py-2 rounded text-sm font-semibold transition-colors"
                        style={{
                            background: filter === status ? 'var(--color-gold)' : 'var(--color-ink-2)',
                            color: filter === status ? 'var(--color-ink)' : 'var(--color-bone)',
                            border: `1px solid ${filter === status ? 'var(--color-gold)' : 'var(--color-hairline)'}`
                        }}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-muted">Loading...</p>
            ) : orders.length === 0 ? (
                <p className="text-muted">No orders found</p>
            ) : (
                <div className="rounded border border-hairline overflow-hidden" style={{ background: 'var(--color-ink-2)' }}>
                    <table className="w-full text-sm text-bone">
                        <thead>
                            <tr className="border-b border-hairline" style={{ background: 'var(--color-ink)' }}>
                                <th className="text-left px-6 py-3">Order ID</th>
                                <th className="text-left px-6 py-3">Customer</th>
                                <th className="text-left px-6 py-3">Items</th>
                                <th className="text-left px-6 py-3">Total</th>
                                <th className="text-left px-6 py-3">Status</th>
                                <th className="text-left px-6 py-3">Date</th>
                                <th className="text-left px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="border-b border-hairline hover:bg-ink transition-colors">
                                    <td className="px-6 py-4 font-mono">{order.id}</td>
                                    <td className="px-6 py-4">{order.customer}</td>
                                    <td className="px-6 py-4">{order.itemCount}</td>
                                    <td className="px-6 py-4 text-gold font-semibold">₪{order.total}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            className="px-2 py-1 rounded text-xs font-semibold bg-ink border border-hairline text-bone focus:outline-none focus:border-gold"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="paid">Paid</option>
                                            <option value="refunded">Refunded</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-muted text-xs">{new Date(order.date).toLocaleDateString('he-IL')}</td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="text-gold hover:underline text-xs"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
