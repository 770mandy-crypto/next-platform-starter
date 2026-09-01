'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useShop } from './providers';
import { Reveal } from './reveal';
import { Newsletter } from './footer';

const FAQ = {
    he: [
        {
            q: 'כמה זמן לוקח משלוח?',
            a: 'שליח עד הבית תוך 2–4 ימי עסקים בכל הארץ. הזמנות שנקלטו לפני 14:00 יוצאות באותו יום. משלוח חינם בהזמנה מעל 500 ₪.'
        },
        {
            q: 'אפשר להחזיר?',
            a: '30 יום מרגע קבלת המשלוח, החזר כספי מלא, גם אם פשוט לא התחברתם. המסגרת צריכה לחזור עם הנרתיק ובלי שריטות.'
        },
        {
            q: 'אפשר להכניס מספר אופטי?',
            a: 'כן. בכל דגם אפשר לבחור באפשרות “עדשות במספר אופטי” בעמוד המוצר. אחרי ההזמנה נשלח לכם טופס למילוי המרשם, והמשקפיים ייצאו תוך 5–7 ימי עסקים.'
        },
        {
            q: 'מה האחריות?',
            a: 'שנתיים על הצירים, המסמרות והמסגרת עצמה. שריטות בעדשות ושבירה מנפילה לא נכללות, אבל תמיד שווה לפנות אלינו — אנחנו מחליפים חלקים במחיר עלות.'
        },
        {
            q: 'איך מטפלים במסגרת אצטט?',
            a: 'שוטפים במים פושרים עם טיפת סבון, מייבשים במטלית המיקרופייבר שהגיעה בקופסה. לא משאירים ברכב בשמש — אצטט מתעוות בחום גבוה. פעם בשנה שווה לקפוץ לאופטיקאי ליישור.'
        },
        {
            q: 'יש חנות פיזית?',
            a: 'הסטודיו שלנו בתל אביב פתוח בתיאום מראש, ימים א׳–ה׳. כתבו לנו ונקבע לכם שעה למדידה של כל הקולקציה.'
        }
    ],
    en: [
        {
            q: 'How long does shipping take?',
            a: 'Courier to your door in 2–4 business days. Orders placed before 2pm ship the same day. Free shipping over $140.'
        },
        {
            q: 'Can I return it?',
            a: '30 days from delivery, full refund, even if you simply did not connect with it. The frame needs to come back with its case and without scratches.'
        },
        {
            q: 'Can I add a prescription?',
            a: 'Yes. Choose the prescription lens option on any product page. We email a form for your prescription and the glasses ship within 5–7 business days.'
        },
        {
            q: 'What does the warranty cover?',
            a: 'Two years on hinges, rivets and the frame itself. Lens scratches and drop damage are excluded, but write to us anyway — we replace parts at cost.'
        },
        {
            q: 'How do I care for acetate?',
            a: 'Rinse in lukewarm water with a drop of soap, dry with the microfibre cloth from the box. Never leave them in a hot car — acetate warps. An annual realignment at any optician keeps the fit true.'
        },
        {
            q: 'Is there a physical store?',
            a: 'Our Tel Aviv studio is open by appointment, Sunday to Thursday. Write to us and we will book you a slot to try the whole collection.'
        }
    ]
};

const CONTACT = {
    he: { title: 'מדברים איתנו', body: 'שאלה על התאמה, מרשם או הזמנה קיימת? כתבו ונחזור באותו יום עסקים.', email: 'hello@ayin.studio', phone: '03-000-0000', hours: 'א׳–ה׳, 09:00–18:00' },
    en: { title: 'Talk to us', body: 'A question about fit, a prescription, or an existing order? Write and we answer within the business day.', email: 'hello@ayin.studio', phone: '+972 3 000 0000', hours: 'Sun–Thu, 9:00–18:00' }
};

function FaqRow({ item, index }) {
    const [open, setOpen] = useState(index === 0);
    return (
        <div className="border-b hairline">
            <button type="button" onClick={() => setOpen(!open)} className="flex items-start justify-between w-full gap-6 py-6 text-start">
                <span className="display text-xl">{item.q}</span>
                <span className="text-2xl leading-none transition-transform duration-300 shrink-0" style={{ transform: open ? 'rotate(45deg)' : 'none' }}>
                    +
                </span>
            </button>
            <div className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ maxHeight: open ? '20rem' : 0, opacity: open ? 1 : 0 }}>
                <p className="max-w-2xl pb-6 leading-relaxed text-inksoft">{item.a}</p>
            </div>
        </div>
    );
}

export function ServiceView() {
    const { t, lang } = useShop();
    const contact = CONTACT[lang];

    return (
        <>
            <section className="px-5 pt-16 pb-10 sm:px-10 sm:pt-24">
                <div className="mx-auto max-w-[1600px]">
                    <p className="mb-5 eyebrow animate-in-up">{t.nav.care}</p>
                    <h1 className="max-w-3xl mb-6">{contact.title}</h1>
                    <p className="max-w-xl leading-relaxed text-inksoft">{contact.body}</p>
                </div>
            </section>

            <section className="px-5 pb-16 sm:px-10">
                <div className="grid gap-4 mx-auto max-w-[1600px] sm:grid-cols-3">
                    {[
                        [t.footer.contact, contact.email],
                        ['טלפון / Phone', contact.phone],
                        [lang === 'he' ? 'שעות' : 'Hours', contact.hours]
                    ].map(([label, value], index) => (
                        <Reveal key={label} delay={index * 90} className="p-6 rounded-2xl bg-bone">
                            <p className="mb-2 eyebrow">{label}</p>
                            <p className="display text-lg">{value}</p>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section className="px-5 py-16 sm:px-10">
                <div className="mx-auto max-w-3xl">
                    <Reveal>
                        <h2 className="mb-8">{t.footer.faq}</h2>
                    </Reveal>
                    <Reveal>
                        {FAQ[lang].map((item, index) => (
                            <FaqRow key={item.q} item={item} index={index} />
                        ))}
                    </Reveal>
                    <Reveal className="mt-12 text-center">
                        <Link href="/collection" className="btn-ayin btn-ghost">
                            <span>{t.sections.all}</span>
                        </Link>
                    </Reveal>
                </div>
            </section>

            <Newsletter />
        </>
    );
}
