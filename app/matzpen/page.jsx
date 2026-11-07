import Link from 'next/link';
import { formatPct, formatPrice } from 'components/matzpen/format';
import { ScoreBadge } from 'components/matzpen/score-badge';
import { WaitlistForm } from 'components/matzpen/waitlist-form';
import { loadDataset } from 'lib/nadlan/dataset';

export const dynamic = 'force-dynamic';

const features = [
    { icon: '🗺️', title: 'מפה של כל הארץ', text: 'כל שכונה מקבלת ציון צמיחה וצבע. רואים במבט אחד איפה המחירים במגמת עלייה.', href: '/matzpen/map' },
    { icon: '📊', title: 'נתונים אמיתיים', text: 'עסקאות שדווחו לרשות המסים ומדדי הלמ״ס, מתעדכנים אוטומטית כל יום.', href: '/matzpen/data' },
    { icon: '💬', title: 'סוכן AI אישי', text: 'מספרים לו תקציב, חדרים ומטרה, והוא ממליץ איפה לקנות ומסביר למה, כולל הסיכונים.', href: '/matzpen/agent' },
    { icon: '🏠', title: 'ישירות מבעלי הדירות', text: 'דירות למכירה בשכונות שבחרתם, וכפתור אחד כדי לדבר עם בעל הדירה.', href: '/matzpen/listings' }
];

const steps = [
    { title: 'מספרים מה מחפשים', text: 'תקציב, כמה חדרים, ואם זה לגור או להשקיע.' },
    { title: 'מקבלים שכונות מומלצות', text: 'הסוכן בודק את כל השכונות בארץ ומסביר מה מניע כל אחת ומה הסיכונים.' },
    { title: 'מדברים עם בעל הדירה', text: 'רואים דירות למכירה באותן שכונות, משווים למחיר החציוני, ופונים ישירות.' }
];

const faq = [
    { q: 'מאיפה הנתונים?', a: 'מחירי העסקאות מגיעים מרשות המסים דרך אתר nadlan.gov.il, והמדדים מהלשכה המרכזית לסטטיסטיקה. אנחנו מעדכנים אותם אוטומטית כל יום.' },
    { q: 'הציון אומר כמה המחיר יעלה?', a: 'לא. אף אחד לא יכול לדעת את זה. הציון מראה סימנים שבעבר הקדימו עליית מחירים: מגמה, פער מהעיר, תשואה ומנועי צמיחה. זה כלי לקבלת החלטות, לא תחזית ולא ייעוץ השקעות.' },
    { q: 'כמה זה עולה?', a: 'השימוש במפה ובסוכן חינמי בתקופת ההשקה. גם פרסום דירה על ידי בעלים הוא בחינם.' },
    { q: 'אתם מתווכים?', a: 'לא. אנחנו לא גובים עמלה ולא מתערבים בעסקה: אנחנו מחברים בין קונים לבעלי דירות, והמשא ומתן נעשה ישירות ביניכם.' }
];

export default async function MatzpenHome() {
    const data = await loadDataset();
    const top = data.areas.slice(0, 3);

    return (
        <main>
            <section className="bg-gradient-to-b from-indigo-50 to-slate-50 px-5 pb-14 pt-12">
                <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
                    <div className="text-center md:text-right">
                        <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">סוכן נדל״ן AI לכל הארץ</span>
                        <h1 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                            איפה כדאי לקנות דירה
                            <br />
                            <span className="text-indigo-600">עכשיו?</span>
                        </h1>
                        <p className="mb-8 text-lg text-slate-600">
                            מצפן נדל״ן סורק כל יום את נתוני העסקאות בכל הארץ, מדרג כל שכונה לפי סימני צמיחה, ומחבר אתכם לדירות למכירה ישירות מהבעלים.
                        </p>
                        <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                            <Link href="/matzpen/agent" className="rounded-full bg-indigo-600 px-8 py-4 text-lg font-bold text-white no-underline shadow-lg hover:bg-indigo-700">
                                💬 שאלו את הסוכן
                            </Link>
                            <Link href="/matzpen/map" className="rounded-full bg-white px-6 py-4 font-bold text-slate-800 no-underline shadow ring-1 ring-slate-200 hover:ring-slate-400">
                                🗺️ למפת השכונות
                            </Link>
                        </div>
                    </div>
                    <div className="rounded-3xl bg-white p-5 shadow-xl ring-1 ring-slate-100">
                        <div className="mb-3 text-sm font-bold text-slate-500">🏆 השכונות המובילות עכשיו{data.isSample ? ' (נתוני דוגמה)' : ''}</div>
                        <ol className="space-y-3">
                            {top.map((a) => (
                                <li key={a.id}>
                                    <Link href={`/matzpen/area/${a.id}`} className="flex items-center gap-3 rounded-2xl p-2 text-slate-900 no-underline hover:bg-slate-50">
                                        <ScoreBadge area={a} size="lg" />
                                        <span className="flex-1">
                                            <span className="block font-black">{a.name}</span>
                                            <span className="block text-sm text-slate-500">
                                                {a.cityName} · {formatPrice(a.price)}
                                            </span>
                                        </span>
                                        <span className="font-bold text-emerald-700">{formatPct(a.change12m)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                        <Link href="/matzpen/ranking" className="mt-3 block text-center text-sm font-bold text-indigo-700">
                            לכל הדירוג ←
                        </Link>
                    </div>
                </div>
            </section>

            <section className="px-5 py-14">
                <div className="mx-auto max-w-5xl">
                    <h2 className="mb-8 text-center text-3xl font-extrabold">מה מקבלים</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {features.map((f) => (
                            <Link key={f.title} href={f.href} className="rounded-2xl bg-white p-6 text-slate-900 no-underline shadow-sm ring-1 ring-slate-100 hover:ring-indigo-300">
                                <div className="mb-3 text-4xl">{f.icon}</div>
                                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                                <p className="text-sm text-slate-600">{f.text}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-white px-5 py-14">
                <div className="mx-auto max-w-5xl">
                    <h2 className="mb-8 text-center text-3xl font-extrabold">איך זה עובד</h2>
                    <ol className="grid gap-5 md:grid-cols-3">
                        {steps.map((s, i) => (
                            <li key={s.title} className="rounded-2xl border border-slate-200 p-6">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-black text-white">{i + 1}</div>
                                <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                                <p className="text-slate-600">{s.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="px-5 py-14">
                <div className="mx-auto grid max-w-5xl items-center gap-6 rounded-3xl bg-slate-900 p-8 text-white md:grid-cols-[1fr_auto]">
                    <div>
                        <h2 className="mb-2 text-2xl font-extrabold">מוכרים דירה?</h2>
                        <p className="text-slate-300">פרסמו בחינם ותגיעו לקונים רציניים, שכבר יודעים למה השכונה שלכם שווה. בלי עמלת תיווך.</p>
                    </div>
                    <Link href="/matzpen/publish" className="rounded-full bg-white px-6 py-3 text-center font-bold text-slate-900 no-underline hover:bg-slate-100">
                        ➕ פרסום דירה בחינם
                    </Link>
                </div>
            </section>

            <section className="bg-white px-5 py-14">
                <div className="mx-auto max-w-2xl">
                    <h2 className="mb-6 text-center text-3xl font-extrabold">שאלות נפוצות</h2>
                    <div className="space-y-3">
                        {faq.map((item) => (
                            <details key={item.q} className="group rounded-xl bg-slate-50 p-5">
                                <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                                    {item.q}
                                    <span className="text-indigo-600 transition group-open:rotate-45">+</span>
                                </summary>
                                <p className="mt-3 text-slate-600">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section id="waitlist" className="scroll-mt-20 px-5 py-14">
                <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-center text-white">
                    <h2 className="mb-3 text-3xl font-extrabold">קבלו עדכון על שכונות שמתחילות לעלות</h2>
                    <p className="mb-8 text-indigo-100">הירשמו ונשלח לכם התראה כשהציון של שכונה שמעניינת אתכם משתנה, ועל פיצ׳רים חדשים.</p>
                    <WaitlistForm cities={data.cities.map(({ id, name }) => ({ id, name }))} />
                </div>
            </section>
        </main>
    );
}
