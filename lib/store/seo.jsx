import { products } from '../../data/catalogue';

export function origin() {
    return (process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function JsonLd({ data }) {
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function productJsonLd(product) {
    const base = origin();
    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name.he,
        description: product.story.he,
        sku: product.slug,
        image: [`${base}${product.image}`],
        brand: { '@type': 'Brand', name: 'MAOR' },
        // No aggregateRating: the shop carries no verified customer reviews,
        // and inventing them would be a claim it cannot stand behind.
        offers: {
            '@type': 'Offer',
            url: `${base}/p/${product.slug}`,
            priceCurrency: 'ILS',
            price: product.price,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
        }
    };
}

export function organisationJsonLd() {
    const base = origin();
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MAOR',
        url: base,
        numberOfItems: products.length
    };
}

export function breadcrumbJsonLd(trail) {
    const base = origin();
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((step, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: step.name,
            item: `${base}${step.path}`
        }))
    };
}
