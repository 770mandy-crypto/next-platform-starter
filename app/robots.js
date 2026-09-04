function baseUrl() {
    return process.env.DEPLOY_PRIME_URL ?? process.env.URL ?? 'http://localhost:3000';
}

export default function robots() {
    const origin = baseUrl().replace(/\/$/, '');

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // The Netlify starter demo pages are not part of the storefront.
                disallow: ['/starter', '/blobs', '/edge', '/revalidation', '/image-cdn', '/api/']
            }
        ],
        sitemap: `${origin}/sitemap.xml`
    };
}
