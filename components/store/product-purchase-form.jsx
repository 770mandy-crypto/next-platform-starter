'use client';

import { useMemo, useState } from 'react';
import { useCart } from './cart-context';
import { nis } from 'lib/store/format';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export function ProductPurchaseForm({ product }) {
  const { addLine } = useCart();
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const stockBySize = useMemo(() => {
    const m = {};
    for (const v of product.product_variants || []) m[v.size] = v.stock;
    return m;
  }, [product.product_variants]);
  const maxQty = size ? Math.max(1, Math.min(10, stockBySize[size] || 0)) : 10;

  function handleAdd() {
    if (!size || !stockBySize[size]) return;
    addLine({
      slug: product.slug,
      title: product.title,
      price: product.price,
      img: product.image_path,
      color: product.color,
      size,
      quantity: qty,
      maxQuantity: stockBySize[size]
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <>
      <span className="qa-label">מידה</span>
      <div className="sizes pdp-sizes">
        {SIZES.map((s) => (
          <button
            key={s}
            aria-pressed={size === s}
            disabled={!stockBySize[s]}
            onClick={() => {
              setSize(s);
              setQty(1);
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="pdp-row">
        <div className="stepper">
          <button aria-label="הפחת כמות" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span>{qty}</span>
          <button aria-label="הוסף כמות" onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>
            +
          </button>
        </div>
        <button className={`qa-add${size ? ' ready' : ''}`} disabled={!size} onClick={handleAdd}>
          {justAdded ? 'נוסף לעגלה ✓' : size ? `הוספה לעגלה · ${nis(product.price * qty)}` : 'בחר מידה'}
        </button>
      </div>
    </>
  );
}
