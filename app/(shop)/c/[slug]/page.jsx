import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { CATEGORIES, productsIn } from '../../../../data/catalogue';
import { ListingView } from '../../../../components/store/views';
import { JsonLd, breadcrumbJsonLd, origin } from '../../../../lib/store/seo';

export function generateStaticParams() {
    return Object.keys(CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const category = CATEGORIES[slug];
    if (!category) return { title: 'MAOR' };
    return {
        title: category.name.he,
        description: category.lead.he,
        alternates: { canonical: `/c/${slug}` }
    };
}

export default async function Page({ params }) {
    const { slug } = await params;
    const category = CATEGORIES[slug];
    if (!category) notFound();
    const items = productsIn(slug);
    const base = origin();

    return (
        <>
            <JsonLd
                data={breadcrumbJsonLd([
                    { name: 'MAOR', path: '/' },
                    { name: 'החנות', path: '/shop' },
                    { name: category.name.he, path: `/c/${slug}` }
                ])}
            />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: category.name.he,
                    description: category.lead.he,
                    url: `${base}/c/${slug}`,
                    mainEntity: {
                        '@type': 'ItemList',
                        numberOfItems: items.length,
                        itemListElement: items.map((product, index) => ({
                            '@type': 'ListItem',
                            position: index + 1,
                            name: product.name.he,
                            url: `${base}/p/${product.slug}`
                        }))
                    }
                }}
            />
            <Suspense fallback={<div className="min-h-[60vh]" />}>
                <ListingView category={slug} />
            </Suspense>
        </>
    );
}
