import Link from 'next/link';
import { ProductCard } from 'components/store/product-card';
import { categories } from 'data/products';
import { getProducts } from 'lib/catalog';

export const metadata = {
    title: 'החנות',
    description: 'כל הפריטים של מאיה בוטיק — שמלות, חולצות, סריגים, חצאיות, מעילים ואקססוריז.'
};

export default async function ShopPage({ searchParams }) {
    const { category } = await searchParams;
    const products = await getProducts();
    const active = categories.find((candidate) => candidate.slug === category)?.slug ?? null;
    const visible = active ? products.filter((product) => product.category === active) : products;

    return (
        <div className="px-6 py-12 mx-auto max-w-6xl">
            <p className="eyebrow">הקולקציה</p>
            <h1 className="mt-3">{active ? categories.find((c) => c.slug === active).name : 'כל הפריטים'}</h1>
            <p className="mt-3 text-mocha">
                {visible.length} פריטים {active ? 'בקטגוריה' : 'בקולקציה'}
            </p>

            <nav aria-label="סינון לפי קטגוריה" className="flex flex-wrap gap-2 mt-8 mb-12">
                <FilterLink href="/shop" active={!active}>
                    הכל
                </FilterLink>
                {categories.map((item) => (
                    <FilterLink key={item.slug} href={`/shop?category=${item.slug}`} active={active === item.slug}>
                        {item.name}
                    </FilterLink>
                ))}
            </nav>

            {visible.length ? (
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((product) => (
                        <ProductCard key={product.slug} product={product} />
                    ))}
                </div>
            ) : (
                <p className="py-12 text-mocha">
                    אין כרגע פריטים בקטגוריה הזו.{' '}
                    <Link href="/shop" className="font-semibold text-clay">
                        חזרה לכל הפריטים
                    </Link>
                </p>
            )}
        </div>
    );
}

function FilterLink({ href, active, children }) {
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`px-4 py-2 text-sm transition-colors border rounded-full ${
                active ? 'border-clay bg-clay text-cream' : 'border-espresso/20 text-mocha hover:border-espresso/50'
            }`}
        >
            {children}
        </Link>
    );
}
