const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://am-clothing.vercel.app';

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
