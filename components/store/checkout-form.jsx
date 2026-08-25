'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutForm({ items, total }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [placed, setPlaced] = useState(null);
    const router = useRouter();

    async function handleCheckout(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Checkout failed');
            }

            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
                return;
            }

            // Payments are off: the order is recorded and settled by contact.
            setPlaced({ orderId: data.orderId, total: data.total });
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to process checkout');
            setLoading(false);
        }
    }

    if (placed) {
        return (
            <div className="max-w-md mx-auto mt-8 text-center space-y-4">
                <p className="text-2xl font-semibold">ההזמנה נקלטה</p>
                <p className="text-sm opacity-70">מספר הזמנה</p>
                <p className="text-xl tracking-widest">{placed.orderId}</p>
                <p className="leading-relaxed">
                    לא בוצע חיוב. ניצור איתך קשר בוואטסאפ או באימייל לתיאום התשלום
                    והמשלוח, בדרך כלל תוך יום עסקים.
                </p>
                <a
                    href="https://wa.me/972559725632"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block border px-6 py-3"
                >
                    שליחת הודעה בוואטסאפ
                </a>
            </div>
        );
    }

    return (
        <form onSubmit={handleCheckout} className="max-w-md mx-auto mt-8">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        דואר אלקטרוני
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded"
                        placeholder="example@email.com"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <div className="pt-4 border-t">
                    <p className="text-lg font-semibold mb-4">
                        סה"כ: ₪{total.toFixed(2)}
                    </p>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gold text-ink py-3 font-semibold rounded hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? 'שולח...' : 'שליחת הזמנה'}
                    </button>
                    <p className="mt-3 text-sm opacity-70 leading-relaxed">
                        לא נגבה תשלום בשלב הזה. נחזור אליך לתיאום התשלום והמשלוח.
                    </p>
                </div>
            </div>
        </form>
    );
}
