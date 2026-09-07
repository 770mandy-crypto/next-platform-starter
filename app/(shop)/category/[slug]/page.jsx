import { notFound } from 'next/navigation';
import { CATEGORIES, productsIn } from '../../../../data/catalogue';
import { CollectionView } from '../../../../components/shop/collection-view';
import { JsonLd, breadcrumbJsonLd, siteOrigin } from '../../../../lib/shop/seo';

export function generateStaticParams() {
    return Object.keys(CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const category = CATEGORIES[slug];
    if (!category) return { title: 'AYIN' };

    return {
        title: category.name.he,
        description: category.lead.he,
        alternates: { canonical: `/category/${slug}` }
    };
}

export default async function Page({ params }) {
    const { slug } = await params;
    const category = CATEGORIES[slug];
    if (!category) notFound();

    const items = productsIn(slug);
    const origin = siteOrigin();

    return (
        <>
            <JsonLd
                data={breadcrumbJsonLd([
                    { name: 'AYIN', path: '/' },
                    { name: 'הקולקציה', path: '/collection' },
                    { name: category.name.he, path: `/category/${slug}` }
                ])}
            />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: category.name.he,
                    description: category.lead.he,
                    url: `${origin}/category/${slug}`,
                    mainEntity: {
                        '@type': 'ItemList',
                        numberOfItems: items.length,
                        itemListElement: items.map((product, index) => ({
                            '@type': 'ListItem',
                            position: index + 1,
                            url: `${origin}/product/${product.slug}`,
                            name: product.name.he
                        }))
                    }
                }}
            />
            <CollectionView initialCategory={slug} />
        </>
    );
}
