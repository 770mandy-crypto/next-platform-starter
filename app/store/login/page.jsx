import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from 'lib/supabase/config';
import { getCurrentUser } from 'lib/store/current-user';
import { GoogleSignInButton } from 'components/store/google-sign-in-button';
import { SetupNotice } from 'components/store/setup-notice';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (!isSupabaseConfigured) {
    return (
      <SetupNotice
        title="ההתחברות עוד לא מחוברת"
        items={['יצירת פרויקט Supabase', 'הפעלת ספק Google תחת Authentication', 'הגדרת משתני הסביבה של Supabase']}
      />
    );
  }

  const { user } = await getCurrentUser();
  if (user) redirect('/store/account');

  return (
    <section className="wrap auth-page">
      <p className="eyebrow">כניסה לחשבון</p>
      <h1>ברוכים הבאים ל-AM</h1>
      <p className="auth-copy">מתחברים כדי לעקוב אחרי ההזמנות שלכם ולשמור על היסטוריית הרכישות.</p>
      <GoogleSignInButton redirectTo="/store/account" />
    </section>
  );
}
