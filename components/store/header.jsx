'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';
import { AccountIcon, BagIcon } from './icons';

const NAV = [
  { href: '/store', label: 'הקולקציה', match: (p) => p === '/store' },
  { href: '/store?cat=tees', label: 'חולצות' },
  { href: '/store?cat=shorts', label: 'מכנסיים' },
  { href: '/store?cat=sets', label: 'סטים' },
  { href: '/store/sizes', label: 'טבלת מידות', match: (p) => p === '/store/sizes' },
  { href: '/store/shipping', label: 'משלוח והחזרות', match: (p) => p === '/store/shipping' },
  { href: '/store/about', label: 'עלינו', match: (p) => p === '/store/about' }
];

export function StoreHeader({ user }) {
  const { count, setDrawerOpen } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(searchParams.get('q') || '');

  function submitSearch(e) {
    e.preventDefault();
    const q = term.trim();
    router.push(q ? `/store?q=${encodeURIComponent(q)}#catalog` : '/store');
  }

  return (
    <header>
      <div className="wrap bar">
        <Link className="mark" href="/store">
          <span className="vs">AM</span>
          <span className="name">CLOTHING</span>
        </Link>

        <form className="head-search" role="search" onSubmit={submitSearch}>
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="חיפוש מוצר, צבע או מידה"
            aria-label="חיפוש בחנות"
          />
        </form>

        <nav className="links">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={item.match?.(pathname) ? 'current' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="icon-cluster">
          <Link className="icon-link" href={user ? '/store/account' : '/store/login'} aria-label={user ? 'החשבון שלי' : 'כניסה'}>
            <AccountIcon />
            <span className="icon-link-label">{user ? 'החשבון' : 'כניסה'}</span>
          </Link>
          <button className="icon-link cart-btn" onClick={() => setDrawerOpen(true)} aria-label="סל הקניות">
            <BagIcon />
            <span className="icon-link-label">הסל</span>
            <span className="cart-count" data-empty={count === 0 ? '' : undefined}>
              {count}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
