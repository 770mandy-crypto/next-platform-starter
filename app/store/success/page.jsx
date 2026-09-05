'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from 'components/store/cart-context';

export default function SuccessPage() {
  const { clear } = useCart();

  // The order is only real once Stripe's webhook confirms it (see
  // app/store/api/webhooks/stripe/route.js) — reaching this page just means the
  // payment step finished, so it's safe to empty the shopping list now.
  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="wrap success-page">
      <p className="eyebrow">תודה</p>
      <h1>ההזמנה התקבלה</h1>
      <p>אישור הזמנה נשלח לכתובת המייל שלכם. נודיע כשההזמנה תצא למשלוח.</p>
      <p>
        <Link className="btn-line" href="/store/account">
          לצפייה בהזמנות שלי
        </Link>
      </p>
    </section>
  );
}
