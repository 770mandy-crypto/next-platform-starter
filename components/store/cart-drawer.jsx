'use client';

import { useCart, lineKey } from './cart-context';
import { useCheckout } from 'lib/store/use-checkout';
import { nis } from 'lib/store/format';

export function CartDrawer() {
  const { lines, removeLine, subtotal, drawerOpen, setDrawerOpen } = useCart();
  const { checkingOut, error, startCheckout } = useCheckout(lines);

  return (
    <>
      <div className={`scrim${drawerOpen ? ' on' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`drawer${drawerOpen ? ' on' : ''}`} aria-label="עגלת קניות">
        <div className="drawer-head">
          <h2>עגלת הקניות</h2>
          <button className="qa-close" style={{ fontSize: '1.1rem' }} aria-label="סגירת העגלה" onClick={() => setDrawerOpen(false)}>
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {lines.length === 0 ? (
            <p className="empty">
              העגלה ריקה.
              <br />
              בחרו פריט מהקולקציה כדי להתחיל.
            </p>
          ) : (
            lines.map((l) => (
              <div className="line" key={lineKey(l)}>
                <img src={l.img} alt={l.title} />
                <div className="line-info">
                  <h4>{l.title}</h4>
                  <p className="vari">
                    מידה {l.size} · {l.color} · {l.quantity} יח׳
                  </p>
                  <div className="line-foot">
                    <button className="line-rm" onClick={() => removeLine(lineKey(l))}>
                      הסרה
                    </button>
                    <span className="line-price">{nis(l.price * l.quantity)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {lines.length > 0 && (
          <div className="drawer-foot">
            <div className="totals">
              <div>
                <span>סכום ביניים</span>
                <span>{nis(subtotal)}</span>
              </div>
              <div>
                <span>משלוח</span>
                <span>חינם</span>
              </div>
              <div className="grand">
                <span>סה״כ</span>
                <strong>{nis(subtotal)}</strong>
              </div>
            </div>
            {error && <p className="auth-error" style={{ marginBottom: '0.75rem' }}>{error}</p>}
            <button className="btn-gold" style={{ width: '100%' }} onClick={startCheckout} disabled={checkingOut}>
              {checkingOut ? 'מעביר לתשלום…' : 'מעבר לתשלום'}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
