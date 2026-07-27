import Link from 'next/link';
import { notFound } from 'next/navigation';
import products from 'data/products.json';
import { ProductThumbnail, formatPrice } from 'components/store/product-thumbnail';
import { AddToCartButton } from 'components/store/add-to-cart-button';
import { ProductCard } from 'components/store/product-card';
import { Stars } from 'components/store/stars';
import { TrustBadges } from 'components/store/trust-badges';
import { Reviews } from 'components/store/reviews';

export function generateStaticParams() {
    return products.map((product) => ({ slug: product.slug }));
}

export function generateMetadata({ params }) {
    const product = products.find((p) => p.slug === params.slug);
    if (!product) {
        return { title: 'Product not found' };
    }
    return {
        title: product.name,
        description: product.tagline,
        openGraph: {
            title: product.name,
            description: product.tagline,
            type: 'website'
        }
    };
}

export default function ProductPage({ params }) {
    const product = products.find((p) => p.slug === params.slug);
    if (!product) {
        notFound();
    }

    const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
    const discount = onSale ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
    const related = products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 3);

    // Product structured data helps Google show rich results (price, rating) in search.
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        category: product.category,
        offers: {
            '@type': 'Offer',
            price: product.price.toFixed(2),
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock'
        },
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount
        }
    };

    return (
        <div className="flex flex-col gap-16">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            <nav className="text-sm text-neutral-400">
                <Link href="/store" className="hover:opacity-80">
                    Shop
                </Link>
                <span className="mx-2">/</span>
                <span className="text-neutral-200">{product.name}</span>
            </nav>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                <div className="relative">
                    <ProductThumbnail
                        emoji={product.emoji}
                        gradient={product.gradient}
                        className="w-full aspect-square"
                        size="text-9xl"
                    />
                    {onSale && (
                        <span className="absolute px-3 py-1 text-sm font-bold rounded-full top-4 right-4 bg-red-500 text-white">
                            -{discount}%
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold tracking-wide uppercase text-primary">
                            {product.category}
                        </span>
                        {product.badge && (
                            <span className="px-2 py-1 text-xs font-bold rounded-full bg-white/10 text-neutral-100">
                                {product.badge}
                            </span>
                        )}
                    </div>

                    <h1>{product.name}</h1>

                    <div className="flex items-center gap-2 text-neutral-300">
                        <Stars rating={product.rating} />
                        <span className="text-sm">
                            {product.rating.toFixed(1)} · {product.reviewCount} reviews
                        </span>
                    </div>

                    <p className="text-lg text-neutral-300">{product.tagline}</p>

                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
                        {onSale && (
                            <>
                                <span className="text-xl line-through text-neutral-500">
                                    {formatPrice(product.compareAtPrice)}
                                </span>
                                <span className="px-2 py-1 text-sm font-bold text-red-100 bg-red-500/80 rounded-sm">
                                    Save {discount}%
                                </span>
                            </>
                        )}
                    </div>

                    <p className="text-neutral-300">{product.description}</p>

                    <ul className="grid grid-cols-1 gap-2 mt-2 sm:grid-cols-2">
                        {product.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-neutral-200">
                                <span className="text-primary">✓</span>
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4">
                        <AddToCartButton product={product} />
                    </div>

                    <TrustBadges className="pt-6 mt-2 border-t border-white/10" />
                </div>
            </div>

            <Reviews rating={product.rating} reviewCount={product.reviewCount} reviews={product.reviews} />

            {related.length > 0 && (
                <section className="flex flex-col gap-6">
                    <h2>More in {product.category}</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((item) => (
                            <ProductCard key={item.slug} product={item} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
