import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isSupabaseConfigured } from 'lib/supabase/config';
import { getProduct, getVariantsOf, totalStock } from 'lib/store/catalog';
import { nis } from 'lib/store/format';
import { SetupNotice } from 'components/store/setup-notice';
import { ProductPurchaseForm } from 'components/store/product-purchase-form';
import { TrustBar } from 'components/store/trust-bar';
import { Breadcrumbs } from 'components/store/breadcrumbs';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  if (!isSupabaseConfigured) return { title: 'מוצר' };
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product ? product.title : 'מוצר' };
}

export default async function ProductPage({ params }) {
  if (!isSupabaseConfigured) {
    return (
      <SetupNotice
        title="החנות עוד לא מחוברת למסד נתונים"
        items={['יצירת פרויקט Supabase', 'הרצת supabase/schema.sql ואז supabase/seed.sql', 'הגדרת משתני הסביבה של Supabase']}
      />
    );
  }

  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const siblings = (await getVariantsOf(product.category)).filter((s) => s.color !== undefined);
  const outOfStock = totalStock(product) === 0;

  return (
    <section className="wrap detail-page">
      <Breadcrumbs category={product.category} title={product.title} />
      <div className="detail-grid">
        <div className="detail-shot">
          <img src={product.image_path} alt={product.title} />
        </div>
        <div className="detail-side">
          {product.badge && !outOfStock && (
            <p className="eyebrow" style={{ marginBottom: 0 }}>
              {product.badge}
            </p>
          )}
          {outOfStock && (
            <p className="eyebrow" style={{ marginBottom: 0 }}>
              אזל מהמלאי
            </p>
          )}
          <h1>{product.title}</h1>
          <p className="pdp-price">
            <span className="now">{nis(product.price)}</span>
            {product.compare_at_price ? <span className="was">{nis(product.compare_at_price)}</span> : null}
          </p>
          {siblings.length > 1 && (
            <div className="pdp-swatches">
              <span className="qa-label" style={{ marginBottom: 0 }}>
                צבע · {product.color}
              </span>
              <div className="swatch-row">
                {siblings.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/store/product/${s.slug}`}
                    className={`swatch${s.slug === product.slug ? ' active' : ''}`}
                    style={{ background: s.color === 'שחור' ? '#050506' : '#f4f1ea' }}
                    aria-label={s.color}
                    aria-current={s.slug === product.slug}
                  />
                ))}
              </div>
            </div>
          )}
          <p className="pdp-desc">{product.description}</p>
          {outOfStock ? (
            <button className="qa-add" disabled>
              אזל מהמלאי
            </button>
          ) : (
            <ProductPurchaseForm product={product} />
          )}
          <TrustBar />
          <div className="details">
            <span className="qa-label" style={{ display: 'block', marginBottom: '1rem' }}>
              פרטי הפריט
            </span>
            <ul>
              {(product.details || []).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
