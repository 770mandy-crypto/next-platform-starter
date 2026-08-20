'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutForm({ items, total }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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

            // Redirect to Stripe checkout
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } catch (err) {
            setError(err.message || 'Failed to process checkout');
            setLoading(false);
        }
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
                        {loading ? 'טוען...' : 'לתשלום'}
                    </button>
                </div>
            </div>
        </form>
    );
}
