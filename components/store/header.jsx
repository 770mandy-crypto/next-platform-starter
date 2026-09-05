'use client';

import Link from 'next/link';
import { useCart } from './cart-context';
import { AccountIcon, BagIcon } from './icons';

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
            עלינו
          </Link>
        </nav>
        <div className="icon-cluster">
          <Link className="icon-link" href={user ? '/store/account' : '/store/login'} aria-label={user ? 'החשבון שלי' : 'כניסה'}>
            <AccountIcon />
            <span className="icon-link-label">{user ? 'החשבון' : 'כניסה'}</span>
          </Link>
          <button className="icon-link cart-btn" id="cartBtn" onClick={() => setDrawerOpen(true)} aria-label="עגלת קניות">
            <BagIcon />
            <span className="icon-link-label">עגלה</span>
            <span className="cart-count">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
