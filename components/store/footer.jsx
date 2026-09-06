import Link from 'next/link';
import { isSupabaseConfigured } from 'lib/supabase/config';
import { NewsletterForm } from './newsletter-form';

const COLUMNS = [
  {
    title: 'הקולקציה',
    links: [
      { href: '/store?cat=tees', label: 'חולצות' },
      { href: '/store?cat=shorts', label: 'מכנסיים' },
      { href: '/store?cat=sets', label: 'סטים' },
      { href: '/store', label: 'כל המוצרים' }
    ]
  },
  {
    title: 'מידע',
    links: [
      { href: '/store/about', label: 'עלינו' },
      { href: '/store/sizes', label: 'טבלת מידות' },
      { href: '/store/shipping', label: 'משלוח והחזרות' },
      { href: '/store/contact', label: 'צור קשר' }
    ]
  },
  {
    title: 'החשבון',
    links: [
      { href: '/store/account', label: 'ההזמנות שלי' },
      { href: '/store/cart', label: 'הסל שלי' },
      { href: '/store/login', label: 'כניסה' }
    ]
  }
];

export function StoreFooter() {
  return (
    <footer>
      <div className="wrap">
        {isSupabaseConfigured && (
          <div className="newsletter">
            <h3>הצטרפו למועדון AM</h3>
            <p>עדכונים על קולקציות חדשות ומכירות מוקדמות, בלי ספאם.</p>
            <NewsletterForm />
          </div>
        )}

        <div className="foot-grid">
          <div>
            <Link className="mark" href="/store">
              <span className="vs">AM</span>
              <span className="name">CLOTHING</span>
            </Link>
            <p style={{ marginTop: '0.9rem' }}>
              כותנה כבדה, גזרות ישרות ורקמת זהב במקום הדפס. קולקציית פתיחה בסדרה מוגבלת, נתפרת בישראל.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h5>{col.title}</h5>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h5>יצירת קשר</h5>
            <ul>
              <li>
                <a href="mailto:hello@amclothing.co.il" dir="ltr">
                  hello@amclothing.co.il
                </a>
              </li>
              <li>
                <span dir="ltr">@am.clothing</span>
              </li>
              <li>משלוח חינם מעל ₪250</li>
            </ul>
          </div>
        </div>

        <div className="foot-rule">
          <span>© AM CLOTHING 2026</span>
          <span>ALL RIGHTS RESERVED</span>
        </div>
      </div>
    </footer>
  );
}
