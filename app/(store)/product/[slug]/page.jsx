import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCart } from 'components/store/add-to-cart';
import { GarmentShot } from 'components/store/garment-shot';
import { ProductCard } from 'components/store/product-card';
import { Reveal } from 'components/store/reveal';
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
    const related = all.filter((item) => item.slug !== product.slug).slice(0, 3);

    return (
        <div className="px-6 py-10 mx-auto max-w-7xl sm:px-10">
            <nav aria-label="פירורי לחם" className="mb-10 text-xs tracking-[0.16em] uppercase text-muted">
                <Link href="/" className="transition-colors hover:text-gold">
                    הבית
                </Link>
                <span className="mx-3">/</span>
                <Link href={`/shop?category=${product.category}`} className="transition-colors hover:text-gold">
                    {categoryName(product.category)}
                </Link>
                <span className="mx-3">/</span>
                <span className="text-bone">{product.title}</span>
            </nav>

            <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
                <div className="relative overflow-hidden border hairline" style={{ aspectRatio: '3 / 4' }}>
                    <GarmentShot product={product} className="w-full h-full" priority />
                    {product.badge && (
                        <span
                            className="absolute top-5 px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.18em] uppercase start-5"
                            style={{ background: 'var(--color-gold)', color: 'var(--color-ink)' }}
                        >
                            {product.badge}
                        </span>
                    )}
                </div>

                <div>
                    <p className="eyebrow">{product.titleHe ?? categoryName(product.category)}</p>
                    <h1 className="mt-4 text-3xl sm:text-4xl">{product.title}</h1>

                    <p className="flex items-baseline gap-4 mt-6 tabular-nums">
                        <span className="text-2xl text-gold">{formatPrice(product.price)}</span>
                        {product.compareAtPrice && (
                            <span className="text-base line-through text-muted">
                                {formatPrice(product.compareAtPrice)}
                            </span>
                        )}
                    </p>

                    <p className="mt-8 leading-relaxed text-muted">{product.description}</p>

                    <hr className="my-10 border-t hairline" />

                    <AddToCart product={product} />

                    {product.details?.length > 0 && (
                        <div className="mt-14">
                            <p className="eyebrow">מפרט</p>
                            <ul className="flex flex-col mt-5 text-sm text-muted">
                                {product.details.map((detail) => (
                                    <li key={detail} className="py-3 border-b hairline first:pt-0">
                                        {detail}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <p className="mt-10 text-xs tracking-[0.14em] uppercase text-muted">
                        משלוח חינם מעל ₪350 · החזרה חינם עד 30 יום
                    </p>
                </div>
            </div>

            {related.length > 0 && (
                <section className="mt-32">
                    <Reveal>
                        <p className="eyebrow">להשלים את הסט</p>
                        <h2 className="mt-4 mb-14">עוד מהקולקציה</h2>
                    </Reveal>
                    <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                        {related.map((item, index) => (
                            <Reveal key={item.slug} delay={index * 110}>
                                <ProductCard product={item} />
                            </Reveal>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
