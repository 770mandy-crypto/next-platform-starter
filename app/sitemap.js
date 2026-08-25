import { products } from 'data/products';

const SITE =
    process.env.NEXT_PUBLIC_SITE_URL ||
    // Vercel injects these itself, so the right domain is used with no manual setup.
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000';

export default function sitemap() {
    const now = new Date();

    const pages = [
        { path: '', priority: 1.0, changeFrequency: 'weekly' },
        { path: '/shop', priority: 0.9, changeFrequency: 'weekly' },
        { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
        { path: '/contact', priority: 0.6, changeFrequency: 'monthly' }
    ];

    return [
        ...pages.map(({ path, priority, changeFrequency }) => ({
            url: `${SITE}${path}`,
            lastModified: now,
            changeFrequency,
            priority
        })),
        ...products.map((p) => ({
            url: `${SITE}/product/${p.slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8
        }))
    ];
}
