import { CATEGORIES, products } from '../data/catalogue';
import { origin } from '../lib/store/seo';

export default function sitemap() {
    const base = origin();
    const now = new Date();
    return [
        { url: `${base}/`, lastModified: now, priority: 1 },
        { url: `${base}/shop`, lastModified: now, priority: 0.9 },
        { url: `${base}/about`, lastModified: now, priority: 0.5 },
        { url: `${base}/help`, lastModified: now, priority: 0.5 },
        ...Object.keys(CATEGORIES).map((slug) => ({ url: `${base}/c/${slug}`, lastModified: now, priority: 0.8 })),
        ...products.map((product) => ({ url: `${base}/p/${product.slug}`, lastModified: now, priority: 0.8 }))
    ];
}
