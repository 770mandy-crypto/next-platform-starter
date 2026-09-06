'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';
import { nis } from 'lib/store/format';

const CATEGORIES = [
  { key: 'tees', label: 'חולצות' },
  { key: 'shorts', label: 'מכנסיים' },
  { key: 'sets', label: 'סטים' }
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const SORTS = [
  { key: 'default', label: 'מיון · מומלץ' },
  { key: 'low', label: 'מחיר · מהנמוך' },
  { key: 'high', label: 'מחיר · מהגבוה' }
];

export function CatalogGrid({ products }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const cat = searchParams.get('cat') || 'all';
  const sizeFilter = searchParams.get('size') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'default';

  // Every control writes to the URL, so a filtered view can be linked and shared.
  function update(changes) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === 'all' || value === 'default') params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(`/store${query ? `?${query}` : ''}#catalog`, { scroll: false });
  }

  const shown = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (sizeFilter !== 'all' && !(p.product_variants || []).some((v) => v.size === sizeFilter && v.stock > 0)) return false;
      if (q) {
        const hay = `${p.title} ${p.title_he || ''} ${p.color} ${p.short}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, cat, sizeFilter, searchQuery, sort]);

  const countIn = (key) => products.filter((p) => p.category === key).length;
  const filtered = cat !== 'all' || sizeFilter !== 'all' || Boolean(searchQuery) || sort !== 'default';

  return (
    <section className="wrap catalog-layout" id="catalog">
      <aside className="rail">
        <h2 className="rail-title">הקולקציה</h2>

        {searchQuery && (
          <div className="rail-group">
            <h3>חיפוש</h3>
            <p className="rail-note">
              תוצאות עבור <strong>{searchQuery}</strong>
            </p>
            <button className="rail-clear" onClick={() => update({ q: '' })}>
              ניקוי החיפוש
            </button>
          </div>
        )}

        <div className="rail-group">
          <h3>קטגוריה</h3>
          <div className="filters">
            <button data-cat="all" aria-pressed={cat === 'all'} onClick={() => update({ cat: 'all' })}>
              הכל
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.key} data-cat={c.key} aria-pressed={cat === c.key} onClick={() => update({ cat: c.key })}>
                {c.label} ({countIn(c.key)})
              </button>
            ))}
          </div>
        </div>

        <div className="rail-group">
          <h3>מידה</h3>
          <div className="filters">
            <button aria-pressed={sizeFilter === 'all'} onClick={() => update({ size: 'all' })}>
              הכל
            </button>
            {SIZES.map((s) => (
              <button key={s} aria-pressed={sizeFilter === s} onClick={() => update({ size: s })}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rail-group">
          <h3>משלוח</h3>
          <p className="rail-note">משלוח חינם בהזמנה מעל ₪250. מתחת לזה — ₪29, 3–5 ימי עסקים.</p>
        </div>

        {filtered && (
          <button className="rail-clear" onClick={() => update({ cat: 'all', size: 'all', q: '', sort: 'default' })}>
            נקה סינון
          </button>
        )}
      </aside>

      <div>
        <div className="results-bar">
          <span className="result-count">
            {shown.length} {shown.length === 1 ? 'מוצר' : 'מוצרים'}
          </span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="מיון">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid">
          {shown.length === 0 ? (
            <p className="empty-state">
              לא נמצאו מוצרים שתואמים לסינון.{' '}
              <button className="rail-clear" onClick={() => update({ cat: 'all', size: 'all', q: '', sort: 'default' })}>
                נקה סינון
              </button>
            </p>
          ) : (
            shown.map((p) => <ProductCard key={p.slug} product={p} />)
          )}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }) {
  const { addLine } = useCart();
  const [size, setSize] = useState(null);

  const stockBySize = useMemo(() => {
    const m = {};
    for (const v of product.product_variants || []) m[v.size] = v.stock;
    return m;
  }, [product.product_variants]);
  const totalStock = Object.values(stockBySize).reduce((a, b) => a + b, 0);
  const lowStock = size ? stockBySize[size] > 0 && stockBySize[size] <= 2 : false;

  function handleAdd() {
    if (!size || !stockBySize[size]) return;
    addLine({
      slug: product.slug,
      title: product.title,
      price: product.price,
      img: product.image_path,
      color: product.color,
      size,
      quantity: 1,
      maxQuantity: stockBySize[size]
    });
    setSize(null);
  }

  return (
    <article className="card">
      <Link className="shot" href={`/store/product/${product.slug}`} aria-label={`צפייה ב${product.title}`}>
        {totalStock === 0 ? (
          <span className="badge">אזל מהמלאי</span>
        ) : product.compare_at_price ? (
          <span className="badge" style={{ background: 'var(--accent)' }}>
            חיסכון {nis(product.compare_at_price - product.price)}
          </span>
        ) : (
          product.badge && <span className="badge">{product.badge}</span>
        )}
        <img src={product.image_path} alt={product.title} loading="lazy" />
      </Link>

      <div className="card-head">
        <h3>
          <Link href={`/store/product/${product.slug}`}>{product.title_he || product.title}</Link>
        </h3>
        <p className="price">
          {product.compare_at_price ? <span className="was">{nis(product.compare_at_price)}</span> : null}
          <span className="now">{nis(product.price)}</span>
        </p>
      </div>

      <p className="card-color">
        <span className="dot" style={{ background: product.color === 'שחור' ? '#14161a' : '#ffffff' }} />
        {product.title} · {product.color}
      </p>
      <p className="short">{product.short}</p>

      {totalStock === 0 ? (
        <button className="qa-open" disabled>
          אזל מהמלאי
        </button>
      ) : (
        <div className="qa-panel">
          <span className="qa-label">מידה</span>
          <div className="sizes">
            {SIZES.map((s) => (
              <button key={s} aria-pressed={size === s} disabled={!stockBySize[s]} onClick={() => setSize(s)}>
                {s}
              </button>
            ))}
          </div>
          {lowStock && (
            <p className="low-stock-note">
              נשארו {stockBySize[size]} {stockBySize[size] === 1 ? 'יחידה' : 'יחידות'} במידה {size}
            </p>
          )}
          <button className="qa-add" disabled={!size} onClick={handleAdd}>
            {size ? `הוספה לסל · ${size}` : 'בחרו מידה'}
          </button>
        </div>
      )}
    </article>
  );
}
