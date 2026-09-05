import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from 'lib/supabase/config';
import { getCurrentUser } from 'lib/store/current-user';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from 'lib/supabase/admin';
import { nis } from 'lib/store/format';
import { SetupNotice } from 'components/store/setup-notice';
import { InventoryEditor } from 'components/store/inventory-editor';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = { paid: 'שולם', pending: 'ממתין לתשלום', failed: 'נכשל', canceled: 'בוטל' };

// Deliberately not under /admin — middleware.js blocks that whole prefix for an
// unrelated demo in this repo. See STORE_SETUP.md for how to grant yourself
// is_admin.
export default async function ManagePage() {
  if (!isSupabaseConfigured) {
    return (
      <SetupNotice
        title="הניהול עוד לא מחובר"
        items={['יצירת פרויקט Supabase', 'הרצת supabase/schema.sql', 'הגדרת משתני הסביבה של Supabase']}
      />
    );
  }

  const { user, profile } = await getCurrentUser();
  if (!user) redirect('/store/login');
  if (!profile?.is_admin) redirect('/store/account');

  if (!isSupabaseAdminConfigured) {
    return (
      <SetupNotice
        title="ניהול המלאי דורש מפתח שירות"
        items={['הגדרת משתנה הסביבה SUPABASE_SERVICE_ROLE_KEY (מתוך Supabase → Project Settings → API)']}
      />
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data: products } = await supabase
    .from('products')
    .select('*, product_variants(size, stock)')
    .order('category');
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <section className="wrap manage-page">
      <p className="eyebrow">ניהול</p>
      <h1 style={{ fontFamily: 'var(--display)', fontWeight: 400, marginBottom: '2rem' }}>מלאי והזמנות</h1>

      <div className="manage-section">
        <h2>מלאי</h2>
        <InventoryEditor products={products || []} />
      </div>

      <div className="manage-section">
        <h2>הזמנות אחרונות</h2>
        {!orders || orders.length === 0 ? (
          <p className="empty-state">עדיין אין הזמנות.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="manage-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>לקוח</th>
                  <th>פריטים</th>
                  <th>סה״כ</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.created_at).toLocaleDateString('he-IL')}</td>
                    <td>{o.customer_email || '—'}</td>
                    <td>{o.order_items.map((it) => `${it.title} (${it.size}) x${it.quantity}`).join(', ')}</td>
                    <td>{nis(o.total)}</td>
                    <td>{STATUS_LABEL[o.status] || o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
