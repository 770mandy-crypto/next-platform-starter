import { products } from '../../data/eyewear';

export function siteOrigin() {
    const raw = process.env.DEPLOY_PRIME_URL ?? process.env.URL ?? 'http://localhost:3000';
    return raw.replace(/\/$/, '');
}

/**
 * Product structured data. Deliberately no aggregateRating: the storefront
 * carries no verified customer reviews, and publishing invented ones as
 * schema is exactly the kind of claim search engines penalise.
 */
export function productJsonLd(product, lang = 'he') {
    const origin = siteOrigin();
    const currency = lang === 'he' ? 'ILS' : 'USD';
    const price = lang === 'he' ? product.price : Math.round(product.price / 3.6);

    return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name[lang],
        alternateName: product.name[lang === 'he' ? 'en' : 'he'],
        description: product.story[lang],
        sku: product.slug,
        image: product.variants.map((variant) => `${origin}${variant.image}`),
        brand: { '@type': 'Brand', name: 'AYIN' },
        material: 'Acetate',
        size: `${product.specs.lens}-${product.specs.bridge}-${product.specs.temple}`,
        weight: { '@type': 'QuantitativeValue', value: product.specs.weight, unitCode: 'GRM' },
        offers: {
            '@type': 'Offer',
            url: `${origin}/product/${product.slug}`,
            priceCurrency: currency,
            price,
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: 'AYIN' }
        }
    };
}

export function organisationJsonLd() {
    const origin = siteOrigin();

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'AYIN',
        url: origin,
        logo: `${origin}/ayin-mark.svg`,
        description: 'AYIN — independent eyewear. Acetate frames, hand-finished.',
        makesOffer: products.map((product) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Product', name: product.name.en, url: `${origin}/product/${product.slug}` }
        }))
    };
}

export function breadcrumbJsonLd(trail) {
    const origin = siteOrigin();

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `${origin}${item.path}`
        }))
    };
}

/** Renders one JSON-LD block. Kept in one place so escaping stays consistent. */
export function JsonLd({ data }) {
    return (
        <script
            type="application/ld+json"
            // JSON.stringify output is escaped for the one sequence that can
            // break out of a script element.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
    );
}
