import { isSupabaseConfigured } from 'lib/supabase/config';
import { listProducts } from 'lib/store/catalog';
import { SetupNotice } from 'components/store/setup-notice';
import { Hero } from 'components/store/hero';
import { Ticker } from 'components/store/ticker';
import { CatalogGrid } from 'components/store/catalog-grid';
import { BrandSection } from 'components/store/brand-section';

export const dynamic = 'force-dynamic';

export default async function StoreHomePage() {
  if (!isSupabaseConfigured) {
    return (
      <SetupNotice
        title="החנות עוד לא מחוברת למסד נתונים"
        items={['יצירת פרויקט Supabase', 'הרצת supabase/schema.sql ואז supabase/seed.sql', 'הגדרת משתני הסביבה של Supabase']}
      />
    );
  }

  const products = await listProducts();

  return (
    <>
      <Hero />
      <Ticker />
      <CatalogGrid products={products} />
      <BrandSection />
    </>
  );
}
