import Link from 'next/link';
import { BrandMark } from 'components/store/brand-mark';
import { SplitHeading } from 'components/store/motion/split-heading';
import { Tilt } from 'components/store/motion/tilt';
import { Reveal } from 'components/store/reveal';

export const metadata = {
    title: 'המותג',
    description: 'VALENTOS CLOTHING — למה סדרה מוגבלת, למה רקמה ולמה רק שחור, לבן וזהב.'
};

const principles = [
    {
        title: 'סדרה מוגבלת',
        text: 'כל דגם מודפס פעם אחת ולא חוזר. זה אומר שאין עודפים, אין אאוטלט, ואין סיכוי לפגוש את אותה חולצה על חצי מהרחוב.'
    },
    {
        title: 'רקמה ולא הדפס',
        text: 'הלוגו רקום בחוט זהב, לא מודפס. הדפס מתקלף אחרי עשר כביסות; רקמה נשארת. זה עולה לנו יותר וזה שווה את זה.'
    },
    {
        title: 'בד כבד',
        text: 'כותנה 240 גרם לחולצות, פוטר 320 גרם למכנסיים. בד כבד נופל ישר, לא מציג את מה שמתחתיו ולא מתעוות בכביסה.'
    },
    {
        title: 'שלושה צבעים בלבד',
        text: 'שחור, לבן וזהב. לא כי אין לנו רעיונות, אלא כי פלטה מצומצמת אומרת שכל פריט מתאים לכל פריט אחר בארון.'
    }
];

export default function AboutPage() {
    return (
        <div className="px-6 py-16 mx-auto max-w-4xl sm:px-10 sm:py-24">
            <Reveal className="text-center">
                <BrandMark scale={1.05} className="mx-auto" />
            </Reveal>

            <Reveal delay={120} className="mt-16">
                <p className="eyebrow">המותג</p>
                <SplitHeading className="mt-4" delay={120}>
                    התחיל מרקמה אחת
                </SplitHeading>
            </Reveal>

            <Reveal delay={200}>
                <div className="flex flex-col gap-6 mt-10 text-lg leading-relaxed text-muted">
                    <p>
                        VALENTOS נולד מתוך שאלה פשוטה: למה בגד בסיסי טוב עולה או מעט מדי ומתפרק, או הרבה מדי בגלל
                        השם שכתוב עליו. רצינו את הנקודה באמצע — בד שבאמת שווה את המחיר, ולוגו שלא צריך לצעוק.
                    </p>
                    <p>
                        התחלנו מרקמה אחת בזהב על חולצה שחורה, בעשרות יחידות, בשביל עצמנו וכמה חברים. הן נגמרו לפני
                        שהספקנו לצלם אותן. מאז הוספנו את הלבן ואת המכנסיים, אבל השיטה נשארה זהה: סדרה קטנה, בד כבד,
                        ואם זה לא מספיק טוב — זה לא יוצא.
                    </p>
                    <p>
                        הקולקציה של 2026 היא ארבעה פריטים. זה בכוונה. עדיף ארבעה שאנחנו עומדים מאחוריהם מאשר ארבעים
                        שסתם ממלאים קטלוג.
                    </p>
                </div>
            </Reveal>

            <Reveal delay={120} className="mt-20">
                <Tilt className="overflow-hidden border hairline" max={5}>
                    <img
                        src="/images/products/logo-embroidery.jpg"
                        alt="רקמת הזהב של VALENTOS על בד"
                        loading="lazy"
                        className="block object-cover w-full"
                        style={{ aspectRatio: '16 / 9' }}
                    />
                </Tilt>
                <p className="mt-4 text-xs tracking-[0.16em] uppercase text-muted">
                    רקמת הזהב, מקרוב
                </p>
            </Reveal>

            <div className="grid gap-y-12 gap-x-10 mt-24 sm:grid-cols-2">
                {principles.map((item, index) => (
                    <Reveal key={item.title} delay={index * 110}>
                        <p className="text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">
                            0{index + 1}
                        </p>
                        <h2 className="mt-4 text-2xl sm:text-2xl">{item.title}</h2>
                        <p className="mt-3 leading-relaxed text-muted">{item.text}</p>
                    </Reveal>
                ))}
            </div>

            <Reveal delay={100}>
                <div
                    className="p-12 mt-24 text-center border hairline"
                    style={{ background: 'var(--color-ink-2)' }}
                >
                    <h2 className="text-2xl sm:text-3xl">הקולקציה באוויר</h2>
                    <p className="mt-4 text-muted">
                        ארבעה פריטים, סדרה מוגבלת. כשנגמר — נגמר, ואנחנו לא מדפיסים שוב.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 mt-9">
                        <Link href="/shop" className="btn-gold">
                            לקולקציה
                        </Link>
                        <Link href="/contact" className="btn-line">
                            שאלה? דברו איתנו
                        </Link>
                    </div>
                </div>
            </Reveal>
        </div>
    );
}
