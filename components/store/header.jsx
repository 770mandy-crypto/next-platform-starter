'use client';

import Link from 'next/link';
import { useCart } from './cart-context';

export function StoreHeader({ user }) {
  const { count, setDrawerOpen } = useCart();

  return (
    <header>
      <div className="wrap bar">
        <Link className="mark" href="/store">
          <span className="vs">AM</span>
          <span className="name">CLOTHING</span>
        </Link>
        <nav className="links" id="nav">
          <Link href="/store?cat=all">הקולקציה</Link>
          <Link href="/store?cat=tees">חולצות</Link>
          <Link href="/store?cat=shorts">מכנסיים</Link>
          <Link href="/store?cat=sets">סטים</Link>
          <Link href="/store#brand" id="navBrand">
            המותג
          </Link>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link className="account-link" href={user ? '/store/account' : '/store/login'}>
            {user ? 'החשבון שלי' : 'כניסה'}
          </Link>
          <button className="cart-btn" id="cartBtn" onClick={() => setDrawerOpen(true)}>
            <span>עגלה</span>
            <span className="cart-count">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
