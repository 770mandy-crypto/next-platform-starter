'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';
import { nis } from 'lib/store/format';

const CATEGORIES = [
  { key: 'all', label: 'הכל' },
  { key: 'tees', label: 'חולצות' },
  { key: 'shorts', label: 'מכנסיים' },
  { key: 'sets', label: 'סטים' }
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export function CatalogGrid({ products }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get('cat') || 'all';
  const sizeFilter = searchParams.get('size') || 'all';
  const searchQuery = (searchParams.get('q') || '').toLowerCase();

  let shown = filter === 'all' ? products : products.filter((p) => p.category === filter);

  if (sizeFilter !== 'all') {
    shown = shown.filter((p) => {
      const hasSize = (p.product_variants || []).some((v) => v.size === sizeFilter && v.stock > 0);
      return hasSize;
    });
  }

  if (searchQuery) {
    shown = shown.filter((p) => p.title.toLowerCase().includes(searchQuery) || p.color.toLowerCase().includes(searchQuery));
  }

  function setFilter(cat) {
    const params = new URLSearchParams(searchParams);
    if (cat === 'all') params.delete('cat');
    else params.set('cat', cat);
    const query = params.toString();
    router.push(`/store${query ? `?${query}` : ''}#catalog`, { scroll: false });
  }

  function setSizeFilter(size) {
    const params = new URLSearchParams(searchParams);
    if (size === 'all') params.delete('size');
    else params.set('size', size);
    const query = params.toString();
    router.push(`/store${query ? `?${query}` : ''}#catalog`, { scroll: false });
  }

  function setSearch(q) {
    const params = new URLSearchParams(searchParams);
    if (!q) params.delete('q');
    else params.set('q', q);
    const query = params.toString();
    router.push(`/store${query ? `?${query}` : ''}#catalog`, { scroll: false });
  }

  return (
    <section className="wrap" id="catalog">
      <div className="sec-head">
        <h2>הקולקציה</h2>
        <div className="catalog-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="חיפוש..."
              value={searchQuery}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filters-container">
            <div className="filters">
              {CATEGORIES.map((c) => (
                <button key={c.key} data-cat={c.key} aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="size-filter">
              <label htmlFor="size-select" className="size-filter-label">
                מידה:
              </label>
              <select id="size-select" value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}>
                <option value="all">הכל</option>
                {SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="grid">
        {shown.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }) {
  const { addLine } = useCart();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);

  const stockBySize = useMemo(() => {
    const m = {};
    for (const v of product.product_variants || []) m[v.size] = v.stock;
    return m;
  }, [product.product_variants]);
  const totalStock = Object.values(stockBySize).reduce((a, b) => a + b, 0);
  const maxQty = size ? Math.max(1, Math.min(10, stockBySize[size] || 0)) : 10;
  const lowStockCount = Object.values(stockBySize).filter((s) => s > 0 && s <= 2).length;

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
    setOpen(false);
    setSize(null);
    setQty(1);
  }

  return (
    <article className="card">
      <Link className="shot" href={`/store/product/${product.slug}`} aria-label={`צפייה ב${product.title}`}>
        {totalStock === 0 ? (
          <span className="badge" style={{ background: 'var(--muted)' }}>
            אזל מהמלאי
          </span>
        ) : lowStockCount > 0 ? (
          <span className="badge" style={{ background: 'var(--gold)', color: 'var(--ink)' }}>
            מעט יחידות
          </span>
        ) : (
          product.badge && <span className="badge">{product.badge}</span>
        )}
        <img src={product.image_path} alt={product.title} loading="lazy" />
      </Link>
      <div className="card-head">
        <h3>
          <Link href={`/store/product/${product.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {product.title}
          </Link>
        </h3>
        <p className="price">
          {product.compare_at_price ? <span className="was">{nis(product.compare_at_price)}</span> : null}
          <span className="now">{nis(product.price)}</span>
        </p>
      </div>
      <p className="card-color">
        <span className="dot" style={{ background: product.color === 'שחור' ? '#050506' : '#f4f1ea' }} />
        {product.color}
      </p>
      <p className="short">{product.short}</p>
      {totalStock === 0 ? (
        <button className="qa-open" disabled>
          אזל מהמלאי
        </button>
      ) : open ? (
        <div className="qa-panel">
          <div className="qa-top">
            <span className="qa-label">בחירת מידה</span>
            <button className="qa-close" aria-label="סגירה" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <div className="sizes">
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
          {size && stockBySize[size] <= 2 && (
            <p className="low-stock-note">
              ⚠ נשארו רק {stockBySize[size]} {stockBySize[size] === 1 ? 'יחידה' : 'יחידות'}
            </p>
          )}
          <div className="qa-row">
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
              {size ? `הוספה לעגלה · ${nis(product.price * qty)}` : 'בחר מידה'}
            </button>
          </div>
        </div>
      ) : (
        <button className="qa-open" onClick={() => setOpen(true)}>
          הוספה מהירה
        </button>
      )}
    </article>
  );
}
