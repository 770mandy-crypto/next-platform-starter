'use client';

import { useState } from 'react';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export function InventoryEditor({ products }) {
  const [stock, setStock] = useState(() => {
    const m = {};
    for (const p of products) {
      for (const v of p.product_variants || []) m[`${p.slug}::${v.size}`] = v.stock;
    }
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function handleChange(key, value) {
    setStock((s) => ({ ...s, [key]: Math.max(0, Number(value) || 0) }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const updates = [];
    for (const p of products) {
      for (const size of SIZES) {
        const key = `${p.slug}::${size}`;
        updates.push({ product_slug: p.slug, size, stock: stock[key] ?? 0 });
      }
    }
    const res = await fetch('/store/api/admin/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    setSaving(false);
    setMessage(res.ok ? 'המלאי עודכן.' : 'שגיאה בשמירה — נסו שוב.');
  }

  return (
    <div>
      {products.map((p) => (
        <div key={p.slug} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 400, marginBottom: '0.5rem' }}>{p.title}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="manage-table">
              <thead>
                <tr>
                  {SIZES.map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {SIZES.map((s) => {
                    const key = `${p.slug}::${s}`;
                    return (
                      <td key={s}>
                        <input
                          className="stock-input"
                          type="number"
                          min="0"
                          value={stock[key] ?? 0}
                          onChange={(e) => handleChange(key, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <div className="save-row">
        <button className="btn-gold" onClick={handleSave} disabled={saving}>
          {saving ? 'שומר…' : 'שמירת מלאי'}
        </button>
        {message && <span className="save-msg">{message}</span>}
      </div>
    </div>
  );
}
