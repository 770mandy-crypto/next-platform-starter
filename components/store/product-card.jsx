import Link from 'next/link';
import { GarmentShot } from 'components/store/garment-shot';
import { Tilt } from 'components/store/motion/tilt';
import { QuickAdd } from 'components/store/quick-add';
import { formatPrice } from 'lib/format';

export function ProductCard({ product, priority = false }) {
    return (
        <article className="group flex flex-col">
            <Link href={`/product/${product.slug}`} className="flex flex-col">
                <Tilt
                    className="relative overflow-hidden border transition-colors duration-500 hairline group-hover:border-gold"
                    max={6}
                >
                    <div style={{ aspectRatio: '3 / 4' }}>
                        <GarmentShot product={product} className="w-full h-full" priority={priority} />
                    </div>

                    {product.badge && (
                        <span
                            className="absolute z-10 top-4 px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.18em] uppercase start-4"
                            style={{ background: 'var(--color-gold)', color: 'var(--color-ink)' }}
                        >
                            {product.badge}
                        </span>
                    )}

                    {/* The prompt to open the product slides up from the hem on hover. */}
                    <span
                        className="absolute inset-x-0 bottom-0 z-10 py-3 text-[0.62rem] font-semibold tracking-[0.26em] text-center uppercase translate-y-full transition-transform duration-500 group-hover:translate-y-0"
                        style={{ background: 'var(--color-gold)', color: 'var(--color-ink)' }}
                        aria-hidden="true"
                    >
                        צפייה בפריט
                    </span>
                </Tilt>

                <div className="flex items-baseline justify-between gap-4 mt-5">
                    <h3
                        className="text-sm tracking-[0.16em] uppercase transition-colors group-hover:text-gold"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        {product.title}
                    </h3>
                    <p className="flex items-baseline gap-2 shrink-0 tabular-nums">
                        {product.compareAtPrice && (
                            <span className="text-xs line-through text-muted">
                                {formatPrice(product.compareAtPrice)}
                            </span>
                        )}
                        <span className="text-sm text-gold">{formatPrice(product.price)}</span>
                    </p>
                </div>

                <p className="mt-1.5 text-sm leading-relaxed text-muted">{product.shortDescription}</p>
            </Link>

            <QuickAdd product={product} />
        </article>
    );
}
