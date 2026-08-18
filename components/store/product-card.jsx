import Link from 'next/link';
import { formatPrice } from 'lib/format';

export function ProductCard({ product }) {
    return (
        <Link href={`/product/${product.slug}`} className="group flex flex-col">
            <div className="relative overflow-hidden rounded-xl bg-sand aspect-[3/4]">
                <img
                    src={product.image}
                    alt={product.imageAlt ?? product.title}
                    loading="lazy"
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                />
                {product.badge && (
                    <span className="absolute px-3 py-1 text-xs font-semibold rounded-full top-3 start-3 bg-cream/95 text-espresso">
                        {product.badge}
                    </span>
                )}
            </div>

            <div className="flex items-baseline justify-between gap-3 mt-4">
                <h3 className="text-base transition-colors font-display group-hover:text-clay">{product.title}</h3>
                <p className="flex items-baseline gap-2 shrink-0">
                    {product.compareAtPrice && (
                        <span className="text-xs line-through text-mocha/70">{formatPrice(product.compareAtPrice)}</span>
                    )}
                    <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                </p>
            </div>

            {product.shortDescription && (
                <p className="mt-1 text-sm leading-relaxed text-mocha line-clamp-2">{product.shortDescription}</p>
            )}
        </Link>
    );
}
