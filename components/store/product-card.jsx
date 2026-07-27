import Link from 'next/link';
import { ProductThumbnail, formatPrice } from './product-thumbnail';
import { AddToCartButton } from './add-to-cart-button';
import { Stars } from './stars';

export function ProductCard({ product }) {
    const onSale = product.compareAtPrice && product.compareAtPrice > product.price;
    const discount = onSale ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

    return (
        <div className="flex flex-col overflow-hidden bg-white rounded-sm text-neutral-600">
            <Link href={`/store/${product.slug}`} className="relative no-underline">
                <ProductThumbnail emoji={product.emoji} gradient={product.gradient} className="h-44" />
                {product.badge && (
                    <span className="absolute px-2 py-1 text-xs font-bold rounded-full top-3 left-3 bg-neutral-900 text-white">
                        {product.badge}
                    </span>
                )}
                {onSale && (
                    <span className="absolute px-2 py-1 text-xs font-bold rounded-full top-3 right-3 bg-red-500 text-white">
                        -{discount}%
                    </span>
                )}
            </Link>
            <div className="flex flex-col flex-1 gap-3 px-5 py-5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold tracking-wide uppercase text-secondary">
                        {product.category}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-neutral-500">
                        <Stars rating={product.rating} />
                        <span>({product.reviewCount})</span>
                    </span>
                </div>
                <Link href={`/store/${product.slug}`} className="no-underline hover:opacity-80">
                    <h3 className="text-neutral-900">{product.name}</h3>
                </Link>
                <p className="text-sm text-neutral-500">{product.tagline}</p>
                <div className="flex items-center justify-between gap-3 pt-2 mt-auto">
                    <span className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-neutral-900">{formatPrice(product.price)}</span>
                        {onSale && (
                            <span className="text-sm line-through text-neutral-400">
                                {formatPrice(product.compareAtPrice)}
                            </span>
                        )}
                    </span>
                    <AddToCartButton product={product} compact />
                </div>
            </div>
        </div>
    );
}
