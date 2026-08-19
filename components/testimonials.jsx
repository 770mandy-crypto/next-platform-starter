import { Reveal } from 'components/reveal';

const testimonials = [
    {
        name: 'נועה כהן',
        role: 'מתאמנת 8 חודשים',
        quote: 'ירדתי 12 ק״ג בלי לצאת מהבית. התוכניות מותאמות לי אישית והמאמן ממש מרגיש נוכח באימון.',
        initials: 'נכ'
    },
    {
        name: 'איתי לוי',
        role: 'מתאמן שנה וחצי',
        quote: 'עברתי הרבה אפליקציות כושר ואף אחת לא נתנה לי את התחושה הזו של אימון סטודיו אמיתי.',
        initials: 'אל'
    },
    {
        name: 'שירה מזרחי',
        role: 'מתאמנת 4 חודשים',
        quote: 'הגמישות בלוח הזמנים והמעקב אחרי ההתקדמות זה מה ששמר עליי מחוברת ועקבית.',
        initials: 'שמ'
    }
];

export function Testimonials() {
    return (
        <section id="testimonials" className="py-20 sm:py-28">
            <Reveal className="max-w-2xl">
                <span className="badge">המלצות</span>
                <h2 className="mt-4">אלפי מתאמנים כבר הצליחו להצית שינוי</h2>
            </Reveal>

            <div className="grid gap-6 mt-12 sm:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((t, index) => (
                    <Reveal key={t.name} delay={index * 100} className="h-full">
                        <div className="flex flex-col h-full p-6 border card-surface rounded-3xl border-edge">
                            <div className="flex gap-1 text-primary" aria-hidden="true">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <svg key={i} viewBox="0 0 20 20" className="w-4 h-4 fill-current">
                                        <path d="M10 1.5 12.6 7l6 .9-4.3 4.2 1 6-5.3-2.8L4.7 18l1-6L1.4 7.9l6-.9L10 1.5Z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="mt-4 text-neutral-200 grow">״{t.quote}״</p>
                            <div className="flex items-center gap-3 pt-5 mt-5 border-t border-edge">
                                <span className="flex items-center justify-center w-10 h-10 text-sm font-bold rounded-full bg-primary/15 text-primary">
                                    {t.initials}
                                </span>
                                <div>
                                    <p className="font-semibold text-white">{t.name}</p>
                                    <p className="text-xs text-muted">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
