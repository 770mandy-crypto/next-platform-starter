import Link from 'next/link';
import { discountedPrice, formatPrice, offer } from 'lib/offer-config';

const benefits = [
    { icon: '🏠', title: 'מתאמנים מהבית', text: 'בלי מנוי, בלי נסיעות ובלי ציוד. מספיק מקום לשטיח.' },
    { icon: '⏱️', title: '20–30 דקות ביום', text: 'אימונים קצרים שנכנסים גם לימים העמוסים.' },
    { icon: '📈', title: 'התקדמות הדרגתית', text: 'מתחילים מהרמה שלך ומעלים קושי שבוע אחרי שבוע.' },
    { icon: '🎥', title: 'הדגמה לכל תרגיל', text: 'יודעים בדיוק מה לעשות ואיך לבצע נכון.' }
];

const steps = [
    { title: 'גרדו וקבלו הנחה', text: `גרדו את הכרטיס וגלו את ההנחה שלכם – ${offer.discountPercent}% על כל התוכניות.` },
    { title: 'בחרו תוכנית', text: 'שבוע להתנסות, חודש להתחלה רצינית, או שלושה חודשים לשינוי של ממש.' },
    { title: 'מקבלים במייל ומתחילים', text: 'מיד אחרי התשלום התוכנית נשלחת אליכם במייל, ואפשר להתחיל כבר היום.' }
];

const faq = [
    {
        q: 'אני מתחיל/ה מאפס. זה מתאים לי?',
        a: 'כן. התוכנית בנויה כך שמתחילים מתרגילים בסיסיים ומתקדמים בהדרגה, וכל תרגיל מגיע עם גרסה קלה יותר.'
    },
    { q: 'צריך ציוד?', a: 'לא. כל האימונים במשקל גוף. מתקן מתח או כיסא יציב יכולים לעזור אבל לא חובה.' },
    {
        q: 'איך מקבלים את התוכנית?',
        a: 'מיד אחרי התשלום נשלח אליכם מייל עם קישור לתוכנית. אם הוא לא הגיע תוך כמה דקות, בדקו בתיקיית הספאם או כתבו לנו.'
    },
    { q: 'זה מנוי מתחדש?', a: 'לא. זה תשלום חד-פעמי לתוכנית שבחרתם, בלי חיובים נוספים.' },
    {
        q: 'אפשר לבטל?',
        a: `כן, בהתאם לחוק הגנת הצרכן. כל הפרטים בתקנון ומדיניות הביטולים.`,
        link: { href: '/fit/terms', label: 'לתקנון' }
    },
    {
        q: 'יש לי בעיה רפואית. אפשר להתאמן?',
        a: 'לפני תחילת כל תוכנית אימונים מומלץ להתייעץ עם רופא, במיוחד אם יש בעיה רפואית, פציעה או הריון.'
    }
];

function Section({ id, title, subtitle, children, className = '' }) {
    return (
        <section id={id} className={`scroll-mt-20 px-5 py-16 ${className}`}>
            <div className="mx-auto max-w-5xl">
                <h2 className="mb-2 text-center text-3xl font-extrabold">{title}</h2>
                {subtitle && <p className="mx-auto mb-10 max-w-xl text-center text-slate-600">{subtitle}</p>}
                {children}
            </div>
        </section>
    );
}

export default function FitHome() {
    const { site } = offer;
    return (
        <main>
            {/* Hero */}
            <section className="bg-gradient-to-b from-orange-50 to-white px-5 pb-16 pt-14">
                <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
                    <div className="text-center md:text-right">
                        <span className="mb-4 inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                            {offer.tagline}
                        </span>
                        <h1 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                            חזקים יותר, מהבית,
                            <br />
                            <span className="text-orange-600">ב-20 דקות ביום</span>
                        </h1>
                        <p className="mb-8 text-lg text-slate-600">
                            תוכנית אימונים מסודרת במשקל גוף, שמתחילה מהרמה שלך ומתקדמת איתך. בלי ציוד ובלי חדר כושר.
                        </p>
                        <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                            <Link
                                href="/offer"
                                className="rounded-full bg-orange-500 px-8 py-4 text-lg font-bold text-white no-underline shadow-lg hover:bg-orange-600"
                            >
                                גרדו וקבלו {offer.discountPercent}% הנחה
                            </Link>
                            <a href="#how" className="font-semibold text-slate-700 no-underline">
                                איך זה עובד ←
                            </a>
                        </div>
                    </div>
                    <div className="relative mx-auto aspect-square w-full max-w-sm">
                        <div className="absolute inset-0 rotate-6 rounded-[2.5rem] bg-gradient-to-br from-orange-400 to-rose-500" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[2.5rem] bg-white p-8 text-center shadow-2xl">
                            <div className="text-7xl">💪</div>
                            <div className="text-2xl font-extrabold">התוכנית שלך</div>
                            <ul className="space-y-1 text-slate-600">
                                <li>✓ אימון מוכן לכל יום</li>
                                <li>✓ הדגמה לכל תרגיל</li>
                                <li>✓ התקדמות שבועית</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <Section title="למה זה עובד" subtitle="כל מה שצריך כדי להתחיל ולהתמיד, בלי לסבך.">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {benefits.map((b) => (
                        <div key={b.title} className="rounded-2xl border border-slate-200 p-6 text-center">
                            <div className="mb-3 text-4xl">{b.icon}</div>
                            <h3 className="mb-2 text-lg font-bold">{b.title}</h3>
                            <p className="text-sm text-slate-600">{b.text}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* How it works */}
            <Section id="how" title="איך זה עובד" className="bg-orange-50/60">
                <ol className="mt-10 grid gap-6 md:grid-cols-3">
                    {steps.map((step, i) => (
                        <li key={step.title} className="rounded-2xl bg-white p-6 shadow-sm">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 font-black text-white">
                                {i + 1}
                            </div>
                            <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                            <p className="text-slate-600">{step.text}</p>
                        </li>
                    ))}
                </ol>
            </Section>

            {/* Plans */}
            <Section
                id="plans"
                title="התוכניות"
                subtitle={`תשלום חד-פעמי, בלי מנוי. ההנחה של ${offer.discountPercent}% נחשפת בכרטיס הגירוד.`}
            >
                <div className="grid gap-5 md:grid-cols-3">
                    {offer.plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative flex flex-col rounded-2xl border-2 p-6 text-center ${
                                plan.popular ? 'border-orange-500 shadow-xl' : 'border-slate-200'
                            }`}
                        >
                            {plan.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">
                                    הכי פופולרי
                                </span>
                            )}
                            <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
                            <p className="mb-5 text-sm text-slate-500">{plan.perDayNote}</p>
                            <div className="text-sm text-slate-400 line-through">{formatPrice(plan.fullPrice)}</div>
                            <div className="mb-6 text-4xl font-black text-orange-600">{formatPrice(discountedPrice(plan))}</div>
                            <Link
                                href="/offer"
                                className={`mt-auto rounded-full py-3 font-bold no-underline ${
                                    plan.popular ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                }`}
                            >
                                לקבלת ההנחה
                            </Link>
                        </div>
                    ))}
                </div>
            </Section>

            {/* FAQ */}
            <Section id="faq" title="שאלות נפוצות" className="bg-slate-50">
                <div className="mx-auto mt-8 max-w-2xl space-y-3">
                    {faq.map((item) => (
                        <details key={item.q} className="group rounded-xl bg-white p-5 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                                {item.q}
                                <span className="text-orange-500 transition group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-slate-600">
                                {item.a}{' '}
                                {item.link && <Link href={item.link.href}>{item.link.label}</Link>}
                            </p>
                        </details>
                    ))}
                </div>
            </Section>

            {/* Contact */}
            <Section id="contact" title="צור קשר" subtitle="שאלה לפני שמתחילים? כתבו לנו, נשמח לעזור.">
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <a
                        href={`https://wa.me/${site.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-green-500 px-6 py-3 font-bold text-white no-underline hover:bg-green-600"
                    >
                        💬 וואטסאפ
                    </a>
                    <a
                        href={`mailto:${site.contactEmail}`}
                        className="rounded-full border-2 border-slate-300 px-6 py-3 font-bold text-slate-800 no-underline hover:border-slate-400"
                    >
                        ✉️ {site.contactEmail}
                    </a>
                </div>
            </Section>

            {/* Final call to action */}
            <section className="px-5">
                <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-orange-500 to-rose-500 px-6 py-12 text-center text-white">
                    <h2 className="mb-3 text-3xl font-extrabold">מוכנים להתחיל?</h2>
                    <p className="mb-6 text-orange-50">גרדו את הכרטיס וגלו את ההנחה שלכם.</p>
                    <Link
                        href="/offer"
                        className="inline-block rounded-full bg-white px-8 py-4 text-lg font-bold text-orange-600 no-underline hover:bg-orange-50"
                    >
                        לכרטיס הגירוד 🎁
                    </Link>
                </div>
            </section>
        </main>
    );
}
