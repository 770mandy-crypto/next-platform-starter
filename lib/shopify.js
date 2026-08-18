/*
Shopify Storefront API client. Server-side only — the access token must never
reach the browser, so nothing here may be imported from a client component.

The store connects to Shopify only when both environment variables below are set:

    SHOPIFY_STORE_DOMAIN            e.g. tbpm0q-c0.myshopify.com
    SHOPIFY_STOREFRONT_ACCESS_TOKEN a public Storefront API access token

Without them the site falls back to the local catalog in data/products.js, so the
boutique renders fine in development and in previews with no credentials at all.
*/

const API_VERSION = '2025-01';

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export function isShopifyConfigured() {
    return Boolean(domain && accessToken);
}

async function shopifyFetch(query, variables = {}, { revalidate = 300 } = {}) {
    const response = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': accessToken
        },
        body: JSON.stringify({ query, variables }),
        next: { revalidate }
    });

    if (!response.ok) {
        throw new Error(`Shopify responded with ${response.status} ${response.statusText}`);
    }

    const body = await response.json();
    if (body.errors?.length) {
        throw new Error(body.errors.map((error) => error.message).join('; '));
    }
    return body.data;
}

const PRODUCT_FIELDS = `
    handle
    title
    description
    productType
    tags
    featuredImage { url altText }
    priceRange { minVariantPrice { amount } }
    compareAtPriceRange { minVariantPrice { amount } }
    options { name values }
    variants(first: 100) {
        nodes {
            id
            availableForSale
            selectedOptions { name value }
        }
    }
`;

// Shopify product type or tag -> local category slug.
const CATEGORY_BY_KEYWORD = [
    [['set', 'סט', 'סטים', 'bundle'], 'sets'],
    [['short', 'מכנס', 'מכנסיים', 'sweatshort'], 'shorts'],
    [['tee', 't-shirt', 'tshirt', 'shirt', 'חולצה', 'חולצות', 'טי'], 'tees']
];

function matchKeyword(haystack, keywords) {
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function haystackFor(product) {
    return [product.title, product.productType, ...(product.tags ?? [])].join(' ').toLowerCase();
}

function categoryFor(product) {
    const haystack = haystackFor(product);
    for (const [keywords, slug] of CATEGORY_BY_KEYWORD) {
        if (matchKeyword(haystack, keywords)) {
            return slug;
        }
    }
    return 'tees';
}

/*
The vector renderings need to know which garment and which colourway to draw.
A Shopify product with real photography never reaches them, but the fields are
filled in anyway so a product missing its image still renders something correct.
*/
function cutFor(product) {
    return matchKeyword(haystackFor(product), ['short', 'מכנס', 'מכנסיים']) ? 'shorts' : 'tee';
}

function toneFor(product) {
    return matchKeyword(haystackFor(product), ['white', 'לבן', 'לבנה', 'לבנים']) ? 'white' : 'black';
}

function optionValues(product, names) {
    const option = product.options?.find((candidate) =>
        names.some((name) => candidate.name.toLowerCase().includes(name))
    );
    return option?.values ?? [];
}

// Bring a Shopify product into the same shape the local catalog uses, so every
// component downstream stays unaware of where the data came from.
function normalizeProduct(product) {
    const price = Number(product.priceRange?.minVariantPrice?.amount ?? 0);
    const compareAt = Number(product.compareAtPriceRange?.minVariantPrice?.amount ?? 0);
    const sizes = optionValues(product, ['size', 'מידה', 'מידות']);
    const colors = optionValues(product, ['color', 'colour', 'צבע']);

    return {
        slug: product.handle,
        title: product.title,
        titleHe: product.title,
        category: categoryFor(product),
        cut: cutFor(product),
        tone: toneFor(product),
        photo: product.featuredImage?.url ?? null,
        price,
        compareAtPrice: compareAt > price ? compareAt : null,
        badge: compareAt > price ? 'מבצע' : null,
        featured: (product.tags ?? []).some((tag) => ['featured', 'מומלץ'].includes(tag.toLowerCase())),
        shortDescription: product.description?.split('\n')[0] ?? '',
        description: product.description ?? '',
        details: [],
        colors: colors.length ? colors.map((name) => ({ name, hex: null })) : [{ name: 'כפי שבתמונה', hex: null }],
        sizes: sizes.length ? sizes : ['מידה אחת'],
        variants: (product.variants?.nodes ?? []).map((variant) => ({
            id: variant.id,
            availableForSale: variant.availableForSale,
            options: Object.fromEntries(variant.selectedOptions.map((option) => [option.name, option.value]))
        }))
    };
}

export async function getShopifyProducts() {
    const data = await shopifyFetch(
        `query Products { products(first: 100, sortKey: CREATED_AT, reverse: true) { nodes { ${PRODUCT_FIELDS} } } }`
    );
    return (data.products?.nodes ?? []).map(normalizeProduct);
}

export async function getShopifyProduct(handle) {
    const data = await shopifyFetch(`query Product($handle: String!) { product(handle: $handle) { ${PRODUCT_FIELDS} } }`, {
        handle
    });
    return data.product ? normalizeProduct(data.product) : null;
}

/*
Create a Shopify cart from local cart lines and return its hosted checkout URL.
Lines without a resolved Shopify variant id are skipped — those only exist while
the site is running on the local catalog.
*/
export async function createShopifyCheckout(lines) {
    const cartLines = lines
        .filter((line) => line.variantId)
        .map((line) => ({ merchandiseId: line.variantId, quantity: line.quantity }));

    if (!cartLines.length) {
        return null;
    }

    const data = await shopifyFetch(
        `mutation CartCreate($lines: [CartLineInput!]!) {
            cartCreate(input: { lines: $lines }) {
                cart { checkoutUrl }
                userErrors { message }
            }
        }`,
        { lines: cartLines },
        { revalidate: 0 }
    );

    const userErrors = data.cartCreate?.userErrors ?? [];
    if (userErrors.length) {
        throw new Error(userErrors.map((error) => error.message).join('; '));
    }
    return data.cartCreate?.cart?.checkoutUrl ?? null;
}
