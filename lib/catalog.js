import { categories, products as localProducts } from 'data/products';
import { getShopifyProduct, getShopifyProducts, isShopifyConfigured } from 'lib/shopify';

export { categories };

/*
Single entry point for catalog data. Prefers live Shopify products and falls back
to the local catalog whenever Shopify is unconfigured, empty, or unreachable —
the storefront should never go blank because of an API hiccup.
*/
export async function getProducts() {
    if (!isShopifyConfigured()) {
        return localProducts;
    }

    try {
        const shopifyProducts = await getShopifyProducts();
        return shopifyProducts.length ? shopifyProducts : localProducts;
    } catch (error) {
        console.error('Falling back to the local catalog — Shopify request failed:', error.message);
        return localProducts;
    }
}

export async function getProduct(slug) {
    if (isShopifyConfigured()) {
        try {
            const product = await getShopifyProduct(slug);
            if (product) {
                return product;
            }
        } catch (error) {
            console.error(`Falling back to the local catalog for "${slug}":`, error.message);
        }
    }
    return localProducts.find((product) => product.slug === slug) ?? null;
}

export async function getFeaturedProducts(limit = 6) {
    const all = await getProducts();
    const featured = all.filter((product) => product.featured);
    return (featured.length ? featured : all).slice(0, limit);
}

