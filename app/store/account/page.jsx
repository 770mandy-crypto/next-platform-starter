import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from 'lib/supabase/config';
import { getCurrentUser } from 'lib/store/current-user';
import { createServerSupabaseClient } from 'lib/supabase/server';
import { nis } from 'lib/store/format';
import { SetupNotice } from 'components/store/setup-notice';
import { SignOutButton } from 'components/store/sign-out-button';
import { ManagePaymentButton } from 'components/store/manage-payment-button';

export const dynamic = 'force-dynamic';

const STATUS_LABEL = { paid: 'שולם', pending: 'ממתין לתשלום', failed: 'נכשל', canceled: 'בוטל' };

export default async function AccountPage() {
  if (!isSupabaseConfigured) {
    return (
      <SetupNotice
        title="ההתחברות עוד לא מחוברת"
        items={['יצירת פרויקט Supabase', 'הפעלת ספק Google תחת Authentication', 'הגדרת משתני הסביבה של Supabase']}
      />
    );
  }

  const { user, profile } = await getCurrentUser();
  if (!user) redirect('/store/login');

  const supabase = await createServerSupabaseClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  return (
    <section className="wrap account-page">
      <div className="account-head">
        <div>
          <p className="eyebrow">החשבון שלי</p>
          <h1>{user.email}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {profile?.stripe_customer_id && <ManagePaymentButton />}
          <SignOutButton />
        </div>
      </div>
      {!orders || orders.length === 0 ? (
        <p className="empty-state">
          עדיין אין הזמנות. <Link href="/store">מעבר לקולקציה</Link>
        </p>
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li className="order-card" key={o.id}>
              <div className="order-card-head">
                <span>{new Date(o.created_at).toLocaleDateString('he-IL')}</span>
                <span className={`order-status ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
              </div>
              <p className="order-items-line">
                {o.order_items.map((it) => `${it.title} · מידה ${it.size} · ${it.quantity} יח׳`).join(' — ')}
              </p>
              <p className="order-items-line">סה״כ: {nis(o.total)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
