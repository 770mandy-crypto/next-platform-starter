'use client';

import { useState } from 'react';

// Shared by the cart drawer and the full cart page: posts the current lines to
// the checkout API route, which re-validates stock and price server-side before
// creating the Stripe session — the client cart is just a shopping list.
export function useCheckout(lines) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState(null);

  async function startCheckout() {
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch('/store/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines })
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || 'לא הצלחנו לפתוח את עמוד התשלום. נסו שוב.');
        setCheckingOut(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('בעיית תקשורת. נסו שוב.');
      setCheckingOut(false);
    }
  }

  return { checkingOut, error, startCheckout };
}
