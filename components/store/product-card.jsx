import Link from 'next/link';
import { ProductThumbnail, formatPrice } from './product-thumbnail';
import { AddToCartButton } from './add-to-cart-button';

export function ProductCard({ product }) {
    return (
        <div className="flex flex-col overflow-hidden bg-white rounded-sm text-neutral-600">
            <Link href={`/store/${product.slug}`} className="no-underline">
                <ProductThumbnail emoji={product.emoji} gradient={product.gradient} className="h-44" />
            </Link>
            <div className="flex flex-col flex-1 gap-3 px-5 py-5">
                <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold tracking-wide uppercase text-secondary">
                        {product.category}
                    </span>
                    <span className="text-sm text-neutral-500">★ {product.rating}</span>
                </div>
                <Link href={`/store/${product.slug}`} className="no-underline hover:opacity-80">
                    <h3 className="text-neutral-900">{product.name}</h3>
                </Link>
                <p className="text-sm text-neutral-500">{product.tagline}</p>
                <div className="flex items-center justify-between gap-3 pt-2 mt-auto">
                    <span className="text-xl font-bold text-neutral-900">{formatPrice(product.price)}</span>
                    <AddToCartButton product={product} compact />
                </div>
            </div>
        </div>
    );
}
