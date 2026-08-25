const SITE =
    process.env.NEXT_PUBLIC_SITE_URL ||
    // Vercel injects these itself, so the right domain is used with no manual setup.
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000';

export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // internal and demo areas carry no value for search results
                disallow: ['/api/', '/admin/', '/account/', '/auth/', '/checkout/', '/dashboard', '/orders']
            }
        ],
        sitemap: `${SITE}/sitemap.xml`
    };
}
