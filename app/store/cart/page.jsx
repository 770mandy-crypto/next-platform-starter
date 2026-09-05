'use client';

import Link from 'next/link';
import { useCart, lineKey } from 'components/store/cart-context';
import { useCheckout } from 'lib/store/use-checkout';
import { nis } from 'lib/store/format';
import { CartLoginNudge } from 'components/store/cart-login-nudge';

export default function CartPage() {
  const { lines, removeLine, setQuantity, subtotal, hydrated } = useCart();
  const { checkingOut, error, startCheckout } = useCheckout(lines);

  if (hydrated && lines.length === 0) {
    return (
      <section className="wrap cart-page">
        <h1>עגלת הקניות</h1>
        <p className="empty-state">
          העגלה ריקה. <Link href="/store">חזרה לקולקציה</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="wrap cart-page">
      <h1>עגלת הקניות</h1>
      <div className="cart-lines">
        {lines.map((l) => {
          const key = lineKey(l);
          return (
            <div className="cart-line" key={key}>
              <img src={l.img} alt={l.title} />
              <div className="cart-line-meta">
                <h3>{l.title}</h3>
                <span>
                  מידה {l.size} · {l.color}
                </span>
                <span>{nis(l.price)} ליחידה</span>
              </div>
              <div className="cart-line-actions">
                <div className="stepper">
                  <button aria-label="הפחת כמות" onClick={() => setQuantity(key, l.quantity - 1)}>
                    −
                  </button>
                  <span>{l.quantity}</span>
                  <button aria-label="הוסף כמות" onClick={() => setQuantity(key, l.quantity + 1)}>
                    +
                  </button>
                </div>
                <span className="line-price">{nis(l.price * l.quantity)}</span>
                <button className="cart-line-remove" onClick={() => removeLine(key)}>
                  הסרה
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>סכום ביניים</span>
          <span>{nis(subtotal)}</span>
        </div>
        <div className="cart-summary-row">
          <span>משלוח</span>
          <span>חינם</span>
        </div>
        <div className="cart-summary-row total">
          <span>סה״כ</span>
          <span>{nis(subtotal)}</span>
        </div>
        <CartLoginNudge />
        {error && <p className="auth-error">{error}</p>}
        <button className="btn-gold" style={{ width: '100%' }} onClick={startCheckout} disabled={checkingOut || lines.length === 0}>
          {checkingOut ? 'מעביר לתשלום…' : 'מעבר לתשלום'}
        </button>
      </div>
    </section>
  );
}
