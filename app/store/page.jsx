import products from 'data/products.json';
import { ProductCard } from 'components/store/product-card';

export const metadata = {
    title: 'Store'
};

export default function StorePage() {
    const categories = [...new Set(products.map((p) => p.category))];

    return (
        <div className="flex flex-col gap-10">
            <section>
                <h1 className="mb-4">Shop</h1>
                <p className="max-w-2xl text-lg text-neutral-300">
                    A small, curated collection of gear for your desk and everyday life. Browse the catalog, add what you
                    like to the cart, and check out — all rendered with Next.js on Netlify.
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                    {categories.map((category) => (
                        <span
                            key={category}
                            className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-white/10 text-neutral-200"
                        >
                            {category}
                        </span>
                    ))}
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                    <ProductCard key={product.slug} product={product} />
                ))}
            </section>
        </div>
    );
}
