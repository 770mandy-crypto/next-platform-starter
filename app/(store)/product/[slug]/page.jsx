import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCart } from 'components/store/add-to-cart';
import { ProductCard } from 'components/store/product-card';
import { categoryName, formatPrice } from 'lib/format';
import { getProduct, getProducts } from 'lib/catalog';

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) {
        return { title: 'המוצר לא נמצא' };
    }
    return { title: product.title, description: product.shortDescription };
}

export default async function ProductPage({ params }) {
    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) {
        notFound();
    }

    const all = await getProducts();
    const related = all.filter((item) => item.category === product.category && item.slug !== product.slug).slice(0, 3);

    return (
        <div className="px-6 py-10 mx-auto max-w-6xl">
            <nav aria-label="פירורי לחם" className="mb-8 text-sm text-mocha">
                <Link href="/">הבית</Link>
                <span className="mx-2">/</span>
                <Link href={`/shop?category=${product.category}`}>{categoryName(product.category)}</Link>
                <span className="mx-2">/</span>
                <span className="text-espresso">{product.title}</span>
            </nav>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="relative overflow-hidden rounded-2xl bg-sand">
                    <img
                        src={product.image}
                        alt={product.imageAlt ?? product.title}
                        className="object-cover w-full aspect-[3/4]"
                    />
                    {product.badge && (
                        <span className="absolute px-3 py-1 text-xs font-semibold rounded-full top-4 start-4 bg-cream/95">
                            {product.badge}
                        </span>
                    )}
                </div>

                <div>
                    <h1>{product.title}</h1>

                    <p className="flex items-baseline gap-3 mt-4">
                        <span className="text-2xl font-semibold">{formatPrice(product.price)}</span>
                        {product.compareAtPrice && (
                            <span className="text-base line-through text-mocha/70">
                                {formatPrice(product.compareAtPrice)}
                            </span>
                        )}
                    </p>

                    <p className="mt-6 leading-relaxed text-mocha">{product.description}</p>

                    <hr className="my-8 border-espresso/10" />

                    <AddToCart product={product} />

                    {product.details?.length > 0 && (
                        <div className="mt-10">
                            <h2 className="text-lg font-display">פרטי הפריט</h2>
                            <ul className="flex flex-col gap-2 mt-3 text-sm text-mocha">
                                {product.details.map((detail) => (
                                    <li key={detail} className="flex gap-2">
                                        <span aria-hidden="true" className="text-clay">
                                            •
                                        </span>
                                        {detail}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <p className="mt-8 text-sm text-mocha">
                        משלוח חינם בהזמנה מעל ₪350 · החזרה חינם עד 30 יום
                    </p>
                </div>
            </div>

            {related.length > 0 && (
                <section className="mt-24">
                    <h2 className="mb-8">אולי גם יתאים</h2>
                    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((item) => (
                            <ProductCard key={item.slug} product={item} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
