import Link from 'next/link';

const CATEGORY_LABEL = { tees: 'חולצות', shorts: 'מכנסיים', sets: 'סטים' };

export function Breadcrumbs({ category, title }) {
  return (
    <nav className="crumbs" aria-label="נתיב ניווט">
      <Link href="/store">החנות</Link>
      <span aria-hidden="true">/</span>
      <Link href={`/store?cat=${category}`}>{CATEGORY_LABEL[category] || category}</Link>
      <span aria-hidden="true">/</span>
      <span className="current">{title}</span>
    </nav>
  );
}
