import { products } from '../data/eyewear';

const SHOP_ROUTES = ['', '/collection', '/story', '/fit', '/service'];

function baseUrl() {
    // Netlify sets URL to the production domain and DEPLOY_PRIME_URL to the
    // branch or preview domain; the preview is the honest self-reference there.
    return process.env.DEPLOY_PRIME_URL ?? process.env.URL ?? 'http://localhost:3000';
}

export default function sitemap() {
    const origin = baseUrl().replace(/\/$/, '');
    const now = new Date();

    return [
        ...SHOP_ROUTES.map((route) => ({
            url: `${origin}${route || '/'}`,
            lastModified: now,
            changeFrequency: route === '' ? 'weekly' : 'monthly',
            priority: route === '' ? 1 : 0.7
        })),
        ...products.map((product) => ({
            url: `${origin}/product/${product.slug}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8
        }))
    ];
}
