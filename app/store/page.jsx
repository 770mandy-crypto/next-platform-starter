import products from 'data/products.json';
import { ProductCard } from 'components/store/product-card';
import { TrustBadges } from 'components/store/trust-badges';

export const metadata = {
    title: 'Store',
    description: 'Premium digital products — presets, templates, UI kits and more. Instant download after checkout.'
};

export default function StorePage() {
    const categories = [...new Set(products.map((p) => p.category))];
    const totalReviews = products.reduce((sum, p) => sum + (p.reviewCount ?? 0), 0);

    return (
        <div className="flex flex-col gap-12">
            {/* Hero */}
            <section className="flex flex-col items-center gap-5 py-6 text-center">
                <span className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-primary/15 text-primary">
                    🔥 Launch sale — up to 53% off
                </span>
                <h1 className="max-w-2xl">Premium digital products that pay for themselves</h1>
                <p className="max-w-xl text-lg text-neutral-300">
                    Presets, templates, and toolkits trusted by {totalReviews.toLocaleString()}+ creators. Buy once,
                    download instantly, use forever.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-sm text-neutral-300">Rated 4.8/5 by our customers</span>
                </div>
            </section>

            <TrustBadges className="py-6 border-y border-white/10" />

            {/* Category filters */}
            <div className="flex flex-wrap justify-center gap-2">
                {categories.map((category) => (
                    <span
                        key={category}
                        className="px-3 py-1 text-xs font-semibold tracking-wide uppercase rounded-full bg-white/10 text-neutral-200"
                    >
                        {category}
                    </span>
                ))}
            </div>

            {/* Product grid */}
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                    <ProductCard key={product.slug} product={product} />
                ))}
            </section>

            {/* Guarantee footer */}
            <section className="flex flex-col items-center gap-3 px-6 py-10 text-center bg-white/5 rounded-sm">
                <span className="text-3xl">↩️</span>
                <h2>Shop risk-free</h2>
                <p className="max-w-md text-neutral-300">
                    Every purchase is backed by a 30-day money-back guarantee. If it&apos;s not right for you, we&apos;ll
                    refund you — no questions asked.
                </p>
            </section>
        </div>
    );
}
