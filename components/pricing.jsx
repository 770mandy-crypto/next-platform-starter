import Link from 'next/link';
import { Reveal } from 'components/reveal';

const plans = [
    {
        name: 'בסיסי',
        price: '49',
        desc: 'להתחיל להתאמן בקצב שלכם.',
        features: ['10 אימונים בחודש', 'ספריית תוכניות מלאה', 'מעקב התקדמות בסיסי'],
        featured: false
    },
    {
        name: 'פרו',
        price: '99',
        desc: 'לרוב המתאמנים שרוצים תוצאות.',
        features: ['אימונים ללא הגבלה', 'תוכנית מותאמת אישית', 'ליווי מאמן שבועי', 'מעקב התקדמות מתקדם'],
        featured: true
    },
    {
        name: 'עילית',
        price: '179',
        desc: 'ליווי צמוד עם תוכנית תזונה.',
        features: ['כל מה שיש בפרו', 'שיחת מאמן אישית חודשית', 'תוכנית תזונה מותאמת', 'עדיפות בתמיכה'],
        featured: false
    }
];

export function Pricing() {
    return (
        <section id="pricing" className="py-20 sm:py-28">
            <Reveal className="max-w-2xl mx-auto text-center">
                <span className="badge">מחירים</span>
                <h2 className="mt-4">בחרו את המסלול שמתאים לכם</h2>
                <p className="mt-4 text-lg text-neutral-300">ביטול בכל עת. 7 ימי ניסיון חינם בכל תוכנית.</p>
            </Reveal>

            <div className="grid gap-6 mt-12 lg:grid-cols-3 lg:items-center">
                {plans.map((plan, index) => (
                    <Reveal key={plan.name} delay={index * 100}>
                        <div
                            className={`relative h-full p-8 rounded-3xl border flex flex-col ${
                                plan.featured
                                    ? 'card-surface border-primary/60 glow-primary lg:scale-105'
                                    : 'card-surface border-edge'
                            }`}
                        >
                            {plan.featured && (
                                <span className="absolute px-3 py-1 text-xs font-bold rounded-full -top-3 right-8 bg-primary text-primary-content">
                                    הכי פופולרי
                                </span>
                            )}
                            <h3 className="text-2xl">{plan.name}</h3>
                            <p className="mt-1 text-sm text-muted">{plan.desc}</p>
                            <p className="mt-6 font-display text-5xl text-white">
                                ₪{plan.price}
                                <span className="text-base font-sans font-normal text-muted"> / לחודש</span>
                            </p>

                            <ul className="flex flex-col gap-3 mt-8 grow">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-200">
                                        <svg viewBox="0 0 20 20" className="w-5 h-5 mt-0.5 shrink-0 fill-primary">
                                            <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" />
                                        </svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <Link href="#faq" className={`mt-8 w-full ${plan.featured ? 'btn' : 'btn-outline'}`}>
                                בואו נתחיל
                            </Link>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
