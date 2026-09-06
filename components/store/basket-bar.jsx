'use client';

import { usePathname } from 'next/navigation';
import { useCart } from './cart-context';
import { nis } from 'lib/store/format';

// A running total pinned to the bottom of every page, so the basket never has
// to be opened just to check what it costs. Hidden on the cart page itself,
// where the same numbers are already on screen.
export function BasketBar() {
  const { count, subtotal, setDrawerOpen } = useCart();
  const pathname = usePathname();

  const hidden = count === 0 || pathname === '/store/cart' || pathname === '/store/success';

  return (
    <div className={`basket-bar${hidden ? '' : ' on'}`} aria-hidden={hidden}>
      <span className="bb-label">
        {count} {count === 1 ? 'פריט בסל' : 'פריטים בסל'}
      </span>
      <span className="bb-total">{nis(subtotal)}</span>
      <button className="bb-go" onClick={() => setDrawerOpen(true)} tabIndex={hidden ? -1 : 0}>
        צפייה בסל
      </button>
    </div>
  );
}
