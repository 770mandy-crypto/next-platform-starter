import Link from 'next/link';
import { ProductCard } from 'components/store/product-card';
import { categories } from 'data/products';
import { getFeaturedProducts } from 'lib/catalog';

export default async function HomePage() {
    const featured = await getFeaturedProducts(6);

    return (
        <>
            <section className="px-6 pt-12 pb-16 mx-auto max-w-6xl sm:pt-20">
                <div className="grid items-center gap-10 lg:grid-cols-2">
                    <div>
                        <p className="eyebrow">קולקציית העונה</p>
                        <h1 className="mt-4 leading-tight">
                            בגדים שנתפרים לאט,
                            <br />
                            ונשארים איתך שנים
                        </h1>
                        <p className="max-w-lg mt-6 text-lg leading-relaxed text-mocha">
                            סדרות קטנות של שמלות, סריגים וחולצות מבדים טבעיים. כל פריט נתפר בישראל, בכמויות מוגבלות,
                            ומיועד להיכנס לארון ולהישאר בו.
                        </p>
                        <div className="flex flex-wrap gap-3 mt-8">
                            <Link href="/shop" className="btn-clay">
                                לצפייה בקולקציה
                            </Link>
                            <Link href="/about" className="btn-ghost">
                                הסיפור שלנו
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <img
                            src="/images/products/alma-linen-dress.svg"
                            alt="שמלת פשתן אלמה"
                            className="object-cover w-full rounded-xl aspect-[3/4] mt-8"
                        />
                        <img
                            src="/images/products/horef-mohair-knit.svg"
                            alt="סריג מוהר חורף"
                            className="object-cover w-full rounded-xl aspect-[3/4]"
                        />
                    </div>
                </div>
            </section>

            <section className="px-6 py-12 bg-sand/60">
                <div className="grid gap-6 mx-auto max-w-6xl sm:grid-cols-3">
                    {[
                        { title: 'תפירה בישראל', text: 'כל פריט נתפר בסדנה קטנה בתל אביב, בסדרות של עשרות יחידות.' },
                        { title: 'בדים טבעיים', text: 'פשתן, כותנה אורגנית, משי וצמר — בדים שנושמים ומתיישנים יפה.' },
                        { title: 'החזרות עד 30 יום', text: 'לא התאים? מחזירים בלי שאלות, ואנחנו סופגים את המשלוח.' }
                    ].map((item) => (
                        <div key={item.title}>
                            <h3 className="text-lg font-display">{item.title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-mocha">{item.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="px-6 py-16 mx-auto max-w-6xl">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="eyebrow">נבחרת הבוטיק</p>
                        <h2 className="mt-2">הפריטים שהכי אוהבים</h2>
                    </div>
                    <Link href="/shop" className="text-sm font-semibold text-clay">
                        לכל הפריטים ←
                    </Link>
                </div>

                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((product) => (
                        <ProductCard key={product.slug} product={product} />
                    ))}
                </div>
            </section>

            <section className="px-6 pb-20 mx-auto max-w-6xl">
                <p className="eyebrow">קנייה לפי קטגוריה</p>
                <div className="flex flex-wrap gap-3 mt-4">
                    {categories.map((category) => (
                        <Link key={category.slug} href={`/shop?category=${category.slug}`} className="btn-ghost">
                            {category.name}
                        </Link>
                    ))}
                </div>
            </section>
        </>
    );
}
