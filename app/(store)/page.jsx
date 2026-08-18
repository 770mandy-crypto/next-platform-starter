import Link from 'next/link';
import { BrandMark } from 'components/store/brand-mark';
import { GarmentShot } from 'components/store/garment-shot';
import { ProductCard } from 'components/store/product-card';
import { Reveal } from 'components/store/reveal';
import { categories } from 'data/products';
import { getFeaturedProducts, getProducts } from 'lib/catalog';

export default async function HomePage() {
    const featured = await getFeaturedProducts(4);
    const all = await getProducts();
    const blackTee = all.find((p) => p.slug === 'valentos-tee-black') ?? all[0];
    const whiteShorts = all.find((p) => p.slug === 'valentos-shorts-white') ?? all[1] ?? all[0];

    return (
        <>
            {/*
            Hero. The load sequence runs on CSS animation delays rather than JS:
            monogram, then wordmark, then the line, then the buttons.
            */}
            <section className="relative overflow-hidden">
                <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(90% 60% at 50% 0%, rgba(194,161,94,0.14) 0%, transparent 62%), var(--color-ink)'
                    }}
                />

                <div className="relative px-6 pt-20 pb-24 mx-auto text-center max-w-7xl sm:px-10 sm:pt-28 sm:pb-32">
                    <div className="rise" style={{ '--rise-delay': '80ms' }}>
                        <BrandMark scale={1.5} shimmer className="mx-auto" />
                    </div>

                    <h1
                        className="max-w-4xl mx-auto mt-14 rise"
                        style={{ '--rise-delay': '620ms', textWrap: 'balance' }}
                    >
                        קולקציית הפתיחה
                    </h1>

                    <p
                        className="max-w-xl mx-auto mt-6 text-lg leading-relaxed text-muted rise"
                        style={{ '--rise-delay': '780ms' }}
                    >
                        ארבעה פריטים. שחור, לבן וזהב. סדרה מוגבלת שלא נדפיס שוב — כשנגמר, נגמר.
                    </p>

                    <div
                        className="flex flex-wrap justify-center gap-4 mt-12 rise"
                        style={{ '--rise-delay': '940ms' }}
                    >
                        <Link href="/shop" className="btn-gold">
                            לקולקציה
                        </Link>
                        <Link href="/about" className="btn-line">
                            הסיפור של המותג
                        </Link>
                    </div>

                    <div
                        className="grid max-w-3xl gap-6 mx-auto mt-20 sm:grid-cols-2 fade-in"
                        style={{ '--rise-delay': '1100ms' }}
                    >
                        <Link href={`/product/${blackTee.slug}`} className="block group">
                            <div className="overflow-hidden border hairline" style={{ aspectRatio: '3 / 4' }}>
                                <div className="w-full h-full transition-transform duration-[1200ms] ease-out group-hover:scale-105">
                                    <GarmentShot product={blackTee} className="w-full h-full" priority />
                                </div>
                            </div>
                        </Link>
                        <Link href={`/product/${whiteShorts.slug}`} className="block group">
                            <div className="overflow-hidden border hairline" style={{ aspectRatio: '3 / 4' }}>
                                <div className="w-full h-full transition-transform duration-[1200ms] ease-out group-hover:scale-105">
                                    <GarmentShot product={whiteShorts} className="w-full h-full" priority />
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </section>

            {/* A quiet band of the three things worth promising. */}
            <section className="border-y hairline" style={{ background: 'var(--color-ink-2)' }}>
                <div className="grid px-6 mx-auto max-w-7xl sm:px-10 sm:grid-cols-3">
                    {[
                        ['סדרה מוגבלת', 'כל דגם מודפס פעם אחת. אין ריפרינט ואין עודפים.'],
                        ['רקמה, לא הדפס', 'הלוגו רקום בחוט זהב — הוא לא מתקלף ולא נסדק בכביסה.'],
                        ['משלוח חינם מעל ₪350', 'עד הבית תוך 3–5 ימי עסקים, החזרה חינם עד 30 יום.']
                    ].map(([title, text], index) => (
                        <Reveal
                            key={title}
                            delay={index * 120}
                            className="px-0 py-10 border-b sm:py-14 hairline sm:border-b-0 sm:border-s sm:px-8 first:sm:border-s-0 last:border-b-0"
                        >
                            <h3 className="text-base tracking-[0.16em] uppercase text-gold">{title}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-muted">{text}</p>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* Featured pieces */}
            <section className="px-6 py-24 mx-auto max-w-7xl sm:px-10 sm:py-32">
                <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-14">
                    <div>
                        <p className="eyebrow">2026</p>
                        <h2 className="mt-4">הפריטים</h2>
                    </div>
                    <Link
                        href="/shop"
                        className="text-xs tracking-[0.22em] uppercase text-gold border-b pb-1"
                        style={{ borderColor: 'var(--color-gold)' }}
                    >
                        לכל הקולקציה
                    </Link>
                </Reveal>

                <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
                    {featured.map((product, index) => (
                        <Reveal key={product.slug} delay={index * 110}>
                            <ProductCard product={product} />
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* Closing statement */}
            <section className="border-t hairline" style={{ background: 'var(--color-ink-2)' }}>
                <div className="px-6 py-24 mx-auto text-center max-w-3xl sm:px-10 sm:py-32">
                    <Reveal>
                        <p className="eyebrow">VALENTOS</p>
                        <h2 className="mt-6" style={{ textWrap: 'balance' }}>
                            לא עוד מותג עם לוגו גדול
                        </h2>
                        <p className="mt-6 text-lg leading-relaxed text-muted">
                            בחרנו רקמה קטנה בזהב על בד כבד, כי פריט טוב לא צריך לצעוק. הקולקציה הראשונה יצאה בסדרה
                            מוגבלת בכוונה — אנחנו מעדיפים להיגמר מאשר להישאר במלאי.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4 mt-10">
                            <Link href="/shop" className="btn-gold">
                                לקולקציה
                            </Link>
                            <Link href="/contact" className="btn-line">
                                דברו איתנו
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Category shortcuts */}
            <section className="px-6 py-20 mx-auto max-w-7xl sm:px-10">
                <Reveal>
                    <p className="eyebrow">קנייה לפי סוג</p>
                    <div className="flex flex-wrap gap-4 mt-6">
                        {categories.map((category) => (
                            <Link key={category.slug} href={`/shop?category=${category.slug}`} className="btn-line">
                                {category.name}
                            </Link>
                        ))}
                    </div>
                </Reveal>
            </section>
        </>
    );
}
