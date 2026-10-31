import Link from 'next/link';
import { offer } from 'lib/offer-config';

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-20 border-b border-orange-100 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
                <Link href="/fit" className="text-lg font-black text-orange-600 no-underline">
                    {offer.brand}
                </Link>
                <nav className="hidden gap-6 text-sm font-medium text-slate-700 sm:flex">
                    <a href="/fit#how" className="no-underline">איך זה עובד</a>
                    <a href="/fit#plans" className="no-underline">תוכניות</a>
                    <a href="/fit#faq" className="no-underline">שאלות נפוצות</a>
                    <a href="/fit#contact" className="no-underline">צור קשר</a>
                </nav>
                <Link
                    href="/offer"
                    className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white no-underline hover:bg-orange-600"
                >
                    לקבלת הנחה
                </Link>
            </div>
        </header>
    );
}

export function SiteFooter() {
    const { site } = offer;
    return (
        <footer className="mt-16 border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    © {new Date().getFullYear()} {site.businessName}
                    {site.businessId && ` · ${site.businessId}`}
                </div>
                <nav className="flex flex-wrap gap-4">
                    <Link href="/fit/terms">תקנון ומדיניות ביטולים</Link>
                    <Link href="/fit/privacy">מדיניות פרטיות</Link>
                    <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
                </nav>
            </div>
        </footer>
    );
}
