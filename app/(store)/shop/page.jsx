import Link from 'next/link';
import { ProductCard } from 'components/store/product-card';
import { Reveal } from 'components/store/reveal';
import { categories } from 'data/products';
import { getProducts } from 'lib/catalog';

export const metadata = {
    title: 'הקולקציה',
    description: 'קולקציית VALENTOS 2026 — חולצות טי ומכנסי פוטר בשחור ולבן, עם רקמת זהב.'
};

export default async function ShopPage({ searchParams }) {
    const { category } = await searchParams;
    const products = await getProducts();
    const active = categories.find((candidate) => candidate.slug === category)?.slug ?? null;
    const visible = active ? products.filter((product) => product.category === active) : products;

    return (
        <div className="px-6 py-16 mx-auto max-w-7xl sm:px-10 sm:py-20">
            <Reveal>
                <p className="eyebrow">2026</p>
                <h1 className="mt-4">{active ? categories.find((c) => c.slug === active).name : 'הקולקציה'}</h1>
                <p className="mt-4 text-muted">
                    {visible.length} פריטים {active ? 'בקטגוריה' : 'בקולקציה'}
                </p>
            </Reveal>

            <Reveal delay={100}>
                <nav
                    aria-label="סינון לפי קטגוריה"
                    className="flex flex-wrap gap-x-8 gap-y-3 pb-5 mt-10 mb-16 border-b hairline"
                >
                    <FilterLink href="/shop" active={!active}>
                        הכל
                    </FilterLink>
                    {categories.map((item) => (
                        <FilterLink key={item.slug} href={`/shop?category=${item.slug}`} active={active === item.slug}>
                            {item.name}
                        </FilterLink>
                    ))}
                </nav>
            </Reveal>

            {visible.length ? (
                <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((product, index) => (
                        <Reveal key={product.slug} delay={(index % 3) * 110}>
                            <ProductCard product={product} priority={index < 3} />
                        </Reveal>
                    ))}
                </div>
            ) : (
                <p className="py-16 text-muted">
                    אין כרגע פריטים בקטגוריה הזו.{' '}
                    <Link href="/shop" className="text-gold">
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
            className="relative pb-1 text-xs tracking-[0.22em] uppercase transition-colors"
            style={{ color: active ? 'var(--color-gold)' : 'var(--color-muted)' }}
        >
            {children}
            {active && (
                <span
                    aria-hidden="true"
                    className="absolute -bottom-[21px] inset-x-0 h-px"
                    style={{ background: 'var(--color-gold)' }}
                />
            )}
        </Link>
    );
}
