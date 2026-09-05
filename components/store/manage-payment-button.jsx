'use client';

import { useState } from 'react';

export function ManagePaymentButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/store/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || 'לא הצלחנו לפתוח את ניהול התשלומים.');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('בעיית תקשורת. נסו שוב.');
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn-line" onClick={handleClick} disabled={loading}>
        {loading ? 'פותח…' : 'ניהול אמצעי תשלום'}
      </button>
      {error && (
        <p className="auth-error" style={{ marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}
