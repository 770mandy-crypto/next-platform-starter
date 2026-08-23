import Link from 'next/link';
import { BrandMark } from 'components/store/brand-mark';
import { categories } from 'data/products';

export function StoreFooter() {
    return (
        <footer className="mt-32 border-t hairline" style={{ background: 'var(--color-ink-2)' }}>
            <div className="grid gap-12 px-6 py-16 mx-auto max-w-7xl sm:px-10 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-1">
                    <BrandMark scale={0.6} />
                    <p className="max-w-xs mt-6 text-sm leading-relaxed text-muted">
                        קולקציית פתיחה בסדרה מוגבלת. שחור, לבן וזהב — בלי יותר מדי, ובלי פחות ממה שצריך.
                    </p>
                </div>

                <div>
                    <p className="mb-5 text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">הקולקציה</p>
                    <ul className="flex flex-col gap-3 text-sm text-muted">
                        {categories.map((category) => (
                            <li key={category.slug}>
                                <Link
                                    href={`/shop?category=${category.slug}`}
                                    className="transition-colors hover:text-bone"
                                >
                                    {category.name}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <Link href="/shop" className="transition-colors hover:text-bone">
                                כל הפריטים
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <p className="mb-5 text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">מידע</p>
                    <ul className="flex flex-col gap-3 text-sm text-muted">
                        <li>
                            <Link href="/about" className="transition-colors hover:text-bone">
                                המותג
                            </Link>
                        </li>
                        <li>
                            <Link href="/contact" className="transition-colors hover:text-bone">
                                צור קשר
                            </Link>
                        </li>
                        <li>
                            <Link href="/contact" className="transition-colors hover:text-bone">
                                משלוחים והחזרות
                            </Link>
                        </li>
                        <li>
                            <Link href="/auth/signin" className="transition-colors hover:text-bone">
                                החשבון שלי
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <p className="mb-5 text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">יצירת קשר</p>
                    <address className="text-sm not-italic leading-loose text-muted">
                        <span dir="ltr" className="block">
                            hello@amclothing.co.il
                        </span>
                        <span dir="ltr" className="block">
                            @am.clothing
                        </span>
                        <span className="block mt-3">משלוחים לכל הארץ, 3–5 ימי עסקים</span>
                    </address>
                </div>
            </div>

            <div className="border-t hairline">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-6 mx-auto text-[0.68rem] tracking-[0.14em] uppercase max-w-7xl sm:px-10 text-muted">
                    <span>© 2026 AM CLOTHING</span>
                    <span>ALL RIGHTS RESERVED</span>
                </div>
            </div>
        </footer>
    );
}
