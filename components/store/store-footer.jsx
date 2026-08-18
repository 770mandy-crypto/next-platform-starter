import Link from 'next/link';
import { categories } from 'data/products';

export function StoreFooter() {
    return (
        <footer className="mt-24 border-t bg-sand/60 border-espresso/10">
            <div className="grid gap-10 px-6 py-14 mx-auto max-w-6xl sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <p className="text-xl font-medium font-display">מאיה בוטיק</p>
                    <p className="mt-3 text-sm leading-relaxed text-mocha">
                        בוטיק אופנה עצמאי. סדרות קטנות, בדים טבעיים ותפירה בישראל.
                    </p>
                </div>

                <div>
                    <p className="mb-3 text-sm font-semibold">קטגוריות</p>
                    <ul className="flex flex-col gap-2 text-sm text-mocha">
                        {categories.map((category) => (
                            <li key={category.slug}>
                                <Link href={`/shop?category=${category.slug}`} className="transition-colors hover:text-clay">
                                    {category.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <p className="mb-3 text-sm font-semibold">מידע</p>
                    <ul className="flex flex-col gap-2 text-sm text-mocha">
                        <li>
                            <Link href="/about" className="transition-colors hover:text-clay">
                                הסיפור שלנו
                            </Link>
                        </li>
                        <li>
                            <Link href="/contact" className="transition-colors hover:text-clay">
                                צור קשר
                            </Link>
                        </li>
                        <li>
                            <Link href="/shop" className="transition-colors hover:text-clay">
                                כל הפריטים
                            </Link>
                        </li>
                        <li>
                            <Link href="/netlify" className="transition-colors hover:text-clay">
                                Netlify platform demos
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <p className="mb-3 text-sm font-semibold">הבוטיק</p>
                    <address className="text-sm not-italic leading-relaxed text-mocha">
                        רחוב שבזי 12, תל אביב
                        <br />
                        ראשון–חמישי 10:00–19:00
                        <br />
                        שישי 09:00–14:00
                        <br />
                        <span dir="ltr" className="inline-block mt-2">
                            03-000-0000
                        </span>
                    </address>
                </div>
            </div>

            <div className="px-6 py-6 text-xs border-t border-espresso/10 text-mocha">
                <div className="mx-auto max-w-6xl">© {new Date().getFullYear()} מאיה בוטיק. כל הזכויות שמורות.</div>
            </div>
        </footer>
    );
}
