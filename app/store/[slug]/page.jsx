import Link from 'next/link';
import { notFound } from 'next/navigation';
import products from 'data/products.json';
import { ProductThumbnail, formatPrice } from 'components/store/product-thumbnail';
import { AddToCartButton } from 'components/store/add-to-cart-button';
import { ProductCard } from 'components/store/product-card';

export function generateStaticParams() {
    return products.map((product) => ({ slug: product.slug }));
}

export function generateMetadata({ params }) {
    const product = products.find((p) => p.slug === params.slug);
    return { title: product ? product.name : 'Product not found' };
}

export default function ProductPage({ params }) {
    const product = products.find((p) => p.slug === params.slug);
    if (!product) {
        notFound();
    }

    const related = products.filter((p) => p.category === product.category && p.slug !== product.slug).slice(0, 3);

    return (
        <div className="flex flex-col gap-16">
            <nav className="text-sm text-neutral-400">
                <Link href="/store" className="hover:opacity-80">
                    Shop
                </Link>
                <span className="mx-2">/</span>
                <span className="text-neutral-200">{product.name}</span>
            </nav>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                <ProductThumbnail
                    emoji={product.emoji}
                    gradient={product.gradient}
                    className="w-full aspect-square"
                    size="text-9xl"
                />

                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold tracking-wide uppercase text-primary">
                            {product.category}
                        </span>
                        <span className="text-sm text-neutral-400">★ {product.rating}</span>
                        <span className="text-sm text-neutral-400">⤓ Instant download</span>
                    </div>

                    <h1>{product.name}</h1>
                    <p className="text-lg text-neutral-300">{product.tagline}</p>
                    <p className="text-3xl font-bold">{formatPrice(product.price)}</p>
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
                </div>
            </div>

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
