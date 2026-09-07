import { notFound } from 'next/navigation';
import { CATEGORIES, getProduct, products } from '../../../../data/catalogue';
import { ProductView } from '../../../../components/store/views';
import { JsonLd, breadcrumbJsonLd, productJsonLd } from '../../../../lib/store/seo';

export function generateStaticParams() {
    return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const product = getProduct(slug);
    if (!product) return { title: 'MAOR' };
    return {
        title: product.name.he,
        description: product.story.he.slice(0, 155),
        alternates: { canonical: `/p/${slug}` },
        openGraph: {
            title: `${product.name.he} | MAOR`,
            description: product.subtitle.he,
            images: [product.image]
        }
    };
}

export default async function Page({ params }) {
    const { slug } = await params;
    const product = getProduct(slug);
    if (!product) notFound();

    return (
        <>
            <JsonLd data={productJsonLd(product)} />
            <JsonLd
                data={breadcrumbJsonLd([
                    { name: 'MAOR', path: '/' },
                    { name: CATEGORIES[product.category].name.he, path: `/c/${product.category}` },
                    { name: product.name.he, path: `/p/${product.slug}` }
                ])}
            />
            <ProductView slug={slug} />
        </>
    );
}
