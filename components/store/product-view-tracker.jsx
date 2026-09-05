'use client';

import { useEffect } from 'react';
import { trackProductView } from './recently-viewed';

export function ProductViewTracker({ product }) {
  useEffect(() => {
    trackProductView({
      slug: product.slug,
      title: product.title,
      color: product.color,
      price: product.price,
      image_path: product.image_path,
    });
  }, [product.slug, product.title, product.color, product.price, product.image_path]);

  return null;
}
