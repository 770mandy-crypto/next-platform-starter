import { categories } from 'data/products';

// Client-safe helpers — no Shopify credentials or server-only imports in here.

export function formatPrice(amount) {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        maximumFractionDigits: 0
    }).format(amount ?? 0);
}

export function categoryName(slug) {
    return categories.find((category) => category.slug === slug)?.name ?? '';
}

// A cart line is identified by the product plus the exact variant chosen.
export function cartLineKey({ slug, size, color }) {
    return [slug, size, color].join('::');
}
