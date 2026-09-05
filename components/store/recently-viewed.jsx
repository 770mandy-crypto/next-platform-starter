'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { nis } from 'lib/store/format';

export function RecentlyViewed() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('am_recently_viewed');
    if (stored) {
      try {
        setProducts(JSON.parse(stored).slice(0, 4));
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  }, []);

  if (!products.length) return null;

  return (
    <div className="recently-viewed-section">
      <h3>צפית לאחרונה</h3>
      <div className="recently-viewed-grid">
        {products.map((product) => (
          <Link key={product.slug} href={`/store/product/${product.slug}`} className="recently-viewed-card">
            <div className="rv-image">
              <img src={product.image_path} alt={product.title} />
            </div>
            <div className="rv-info">
              <h4>{product.title}</h4>
              <p className="rv-color">{product.color}</p>
              <p className="rv-price">{nis(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function trackProductView(product) {
  try {
    const key = 'am_recently_viewed';
    const stored = localStorage.getItem(key) || '[]';
    let viewed = JSON.parse(stored);

    viewed = viewed.filter((p) => p.slug !== product.slug);
    viewed.unshift(product);
    viewed = viewed.slice(0, 12);

    localStorage.setItem(key, JSON.stringify(viewed));
  } catch (e) {
    // Silently fail if localStorage unavailable
  }
}
