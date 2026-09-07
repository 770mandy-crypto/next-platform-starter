import { origin } from '../lib/store/seo';

export default function robots() {
    const base = origin();
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // the Netlify starter demo routes and anything private
                disallow: ['/api/', '/checkout', '/search', '/saved', '/starter', '/blobs', '/bot', '/classics', '/diag', '/edge', '/image-cdn', '/market', '/middleware', '/revalidation', '/routing', '/scan', '/setup', '/upload', '/quotes']
            }
        ],
        sitemap: `${base}/sitemap.xml`
    };
}
