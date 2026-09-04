import { notFound } from 'next/navigation';
import { products, getProduct } from '../../../../data/eyewear';
import { ProductView } from '../../../../components/shop/product-view';
import { JsonLd, productJsonLd, breadcrumbJsonLd } from '../../../../lib/shop/seo';

export function generateStaticParams() {
    return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const product = getProduct(slug);
    if (!product) return { title: 'AYIN' };

    return {
        title: `${product.name.he} · ${product.name.en}`,
        description: product.tagline.he,
        alternates: { canonical: `/product/${slug}` },
        openGraph: {
            type: 'website',
            title: `${product.name.he} — AYIN`,
            description: product.tagline.he,
            images: product.variants.map((variant) => ({ url: variant.image, width: 1206, height: 1206 }))
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
                    { name: 'AYIN', path: '/' },
                    { name: 'הקולקציה', path: '/collection' },
                    { name: product.name.he, path: `/product/${slug}` }
                ])}
            />
            <ProductView slug={slug} />
        </>
    );
}
