import { notFound } from 'next/navigation';
import { products, getProduct } from '../../../../data/eyewear';
import { ProductView } from '../../../../components/shop/product-view';

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
        openGraph: { images: [product.variants[0].image] }
    };
}

export default async function Page({ params }) {
    const { slug } = await params;
    if (!getProduct(slug)) notFound();
    return <ProductView slug={slug} />;
}
