'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrderDetailPage({ params }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function fetchOrder() {
            try {
                const authRes = await fetch('/api/auth/me');
                if (!authRes.ok) {
                    router.push('/auth/signin');
                    return;
                }

                const orderRes = await fetch(`/api/orders/${params.id}`);
                if (!orderRes.ok) {
                    setError('ההזמנה לא נמצאה');
                    setLoading(false);
                    return;
                }

                const data = await orderRes.json();
                setOrder(data.order);
            } catch (err) {
                console.error('Fetch error:', err);
                setError('שגיאה בטעינת ההזמנה');
            } finally {
                setLoading(false);
            }
        }

        fetchOrder();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="px-6 py-16 mx-auto max-w-2xl sm:px-10 sm:py-24">
                <p className="text-muted">טוען...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="px-6 py-16 mx-auto max-w-2xl sm:px-10 sm:py-24">
                <p className="text-red-500 mb-4">{error || 'ההזמנה לא נמצאה'}</p>
                <Link href="/account/orders" className="text-gold hover:underline">
                    חזור להזמנות
                </Link>
            </div>
        );
    }

    return (
        <div className="px-6 py-16 mx-auto max-w-2xl sm:px-10 sm:py-24">
            <Link href="/account/orders" className="text-gold hover:underline mb-8 inline-block">
                ← חזור להזמנות
            </Link>

            <h1 className="text-3xl font-bold mb-8">הזמנה #{order.id}</h1>

            <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-ink-2 border border-hairline rounded">
                <div>
                    <p className="text-sm text-muted mb-1">תאריך</p>
                    <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString('he-IL')}</p>
                </div>
                <div>
                    <p className="text-sm text-muted mb-1">סטטוס</p>
                    <p className="font-semibold capitalize">{order.status}</p>
                </div>
                <div>
                    <p className="text-sm text-muted mb-1">סכום</p>
                    <p className="font-semibold text-gold text-lg">₪{order.total}</p>
                </div>
                <div>
                    <p className="text-sm text-muted mb-1">מזהה תשלום</p>
                    <p className="font-mono text-xs">{order.stripePaymentId || 'ממתין'}</p>
                </div>
            </div>

            <h2 className="text-xl font-bold mb-4">פריטים</h2>
            {order.items && order.items.length > 0 ? (
                <div className="space-y-3 mb-8">
                    {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between p-3 bg-ink-2 border border-hairline rounded">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-muted">כמות: {item.quantity}</p>
                            </div>
                            <p className="font-semibold">₪{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-muted mb-8">אין פריטים בהזמנה זו</p>
            )}

            <div className="pt-8 border-t border-hairline text-center">
                <p className="text-muted mb-4">יש שאלות? צור קשר עם שירות הלקוחות שלנו</p>
                <Link href="/" className="text-gold hover:underline">
                    חזור לעמוד הבית
                </Link>
            </div>
        </div>
    );
}
