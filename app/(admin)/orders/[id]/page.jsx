'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminOrderDetailPage({ params }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchOrder() {
            try {
                const res = await fetch(`/api/admin/orders/${params.id}`);
                if (!res.ok) {
                    setError('Order not found');
                    setLoading(false);
                    return;
                }

                const data = await res.json();
                setOrder(data.order);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to load order');
            } finally {
                setLoading(false);
            }
        }

        fetchOrder();
    }, [params.id]);

    if (loading) {
        return (
            <div className="p-8">
                <p className="text-muted">Loading...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="p-8">
                <p className="text-red-500 mb-4">{error || 'Order not found'}</p>
                <Link href="/admin/orders" className="text-gold hover:underline">
                    ← Back to Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8">
            <Link href="/admin/orders" className="text-gold hover:underline mb-8 inline-block">
                ← Back to Orders
            </Link>

            <h1 className="text-3xl font-bold text-bone mb-8">Order #{order.id}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="rounded border border-hairline p-6" style={{ background: 'var(--color-ink-2)' }}>
                    <h2 className="text-xl font-bold text-bone mb-4">Order Details</h2>
                    <div className="space-y-3 text-sm text-bone">
                        <div>
                            <p className="text-muted mb-1">Customer</p>
                            <p className="font-semibold">{order.customer}</p>
                        </div>
                        <div>
                            <p className="text-muted mb-1">Email</p>
                            <p className="font-semibold">{order.email}</p>
                        </div>
                        <div>
                            <p className="text-muted mb-1">Date</p>
                            <p className="font-semibold">{new Date(order.date).toLocaleDateString('he-IL')}</p>
                        </div>
                        <div>
                            <p className="text-muted mb-1">Status</p>
                            <select
                                defaultValue={order.status}
                                className="px-3 py-2 rounded text-xs font-semibold bg-ink border border-hairline text-bone focus:outline-none focus:border-gold"
                            >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="rounded border border-hairline p-6" style={{ background: 'var(--color-ink-2)' }}>
                    <h2 className="text-xl font-bold text-bone mb-4">Totals</h2>
                    <div className="space-y-3 text-sm text-bone">
                        <div className="flex justify-between">
                            <span className="text-muted">Subtotal:</span>
                            <span>₪{(order.total * 0.9).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Tax (10%):</span>
                            <span>₪{(order.total * 0.1).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-hairline pt-3 flex justify-between font-bold">
                            <span>Total:</span>
                            <span className="text-gold">₪{order.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {order.items && order.items.length > 0 && (
                <div className="mt-8 rounded border border-hairline p-6" style={{ background: 'var(--color-ink-2)' }}>
                    <h2 className="text-xl font-bold text-bone mb-4">Items</h2>
                    <table className="w-full text-sm text-bone">
                        <thead>
                            <tr className="border-b border-hairline">
                                <th className="text-left py-2">Product</th>
                                <th className="text-left py-2">Qty</th>
                                <th className="text-left py-2">Price</th>
                                <th className="text-right py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={item.id} className="border-b border-hairline">
                                    <td className="py-3">{item.name}</td>
                                    <td className="py-3">{item.quantity}</td>
                                    <td className="py-3">₪{item.price}</td>
                                    <td className="py-3 text-right">₪{(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
