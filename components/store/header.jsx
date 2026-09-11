'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';
import { AccountIcon, BagIcon } from './icons';

const SHOP = [
  { href: '/store', label: 'כל הקולקציה', match: (p, q) => p === '/store' && !q },
  { href: '/store?cat=tees', label: 'חולצות', match: (p, q) => p === '/store' && q === 'tees' },
  { href: '/store?cat=shorts', label: 'מכנסיים', match: (p, q) => p === '/store' && q === 'shorts' },
  { href: '/store?cat=sets', label: 'סטים', match: (p, q) => p === '/store' && q === 'sets' }
];

const INFO = [
  { href: '/store/sizes', label: 'טבלת מידות' },
  { href: '/store/shipping', label: 'משלוח והחזרות' },
  { href: '/store/about', label: 'עלינו' },
  { href: '/store/contact', label: 'צור קשר' }
];

export function StoreHeader({ user }) {
  const { count, setDrawerOpen } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat');
  const [term, setTerm] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);

  // The menu covers the page, so the page behind it should not scroll away.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // A navigation is the one thing that should always close it.
  useEffect(() => setMenuOpen(false), [pathname, searchParams]);

  function submitSearch(e) {
    e.preventDefault();
    const q = term.trim();
    setMenuOpen(false);
    router.push(q ? `/store?q=${encodeURIComponent(q)}#catalog` : '/store');
  }

  return (
    <header>
      <div className="wrap bar">
        <button
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="store-menu"
          aria-label={menuOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`menu-bars${menuOpen ? ' open' : ''}`} aria-hidden="true">
            <i />
            <i />
          </span>
        </button>

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
          {[...SHOP.slice(1), ...INFO].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.match ? (item.match(pathname, cat) ? 'current' : undefined) : pathname === item.href ? 'current' : undefined}
            >
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

      <div className={`menu-scrim${menuOpen ? ' on' : ''}`} onClick={() => setMenuOpen(false)} />
      <div className={`menu-panel${menuOpen ? ' on' : ''}`} id="store-menu" hidden={!menuOpen}>
        <div className="wrap">
          <form className="menu-search" role="search" onSubmit={submitSearch}>
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="חיפוש מוצר, צבע או מידה"
              aria-label="חיפוש בחנות"
            />
          </form>

          <h2>הקולקציה</h2>
          <ul>
            {SHOP.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>

          <h2>מידע</h2>
          <ul>
            {INFO.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>

          <h2>החשבון</h2>
          <ul>
            <li>
              <Link href={user ? '/store/account' : '/store/login'}>{user ? 'ההזמנות שלי' : 'כניסה'}</Link>
            </li>
            <li>
              <Link href="/store/cart">הסל שלי</Link>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
