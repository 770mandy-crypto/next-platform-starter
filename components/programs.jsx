import { Reveal } from 'components/reveal';

const programs = [
    {
        title: 'כוח פונקציונלי',
        desc: 'בניית שריר וכוח אמיתי עם משקל גוף ומשקולות יד — התקדמות שבועית מדודה.',
        meta: ['30 דק׳', 'כל הרמות'],
        icon: (
            <path d="M4 12h2m12 0h2M7 8v8m10-8v8M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )
    },
    {
        title: 'HIIT שריפה',
        desc: 'אינטרוולים בעצימות גבוהה לשריפת שומן מקסימלית בזמן מינימלי.',
        meta: ['20 דק׳', 'מתקדם'],
        icon: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    },
    {
        title: 'יוגה וגמישות',
        desc: 'שחרור מתחים, שיפור טווחי תנועה והתאוששות פעילה בין אימונים.',
        meta: ['25 דק׳', 'כל הרמות'],
        icon: <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    },
    {
        title: 'קרדיו בוקסינג',
        desc: 'שילוב של אגרוף וקרדיו לשריפת קלוריות ופריקת אנרגיה.',
        meta: ['35 דק׳', 'בינוני'],
        icon: <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    },
    {
        title: 'ליבה וברזל',
        desc: 'בטן, גב תחתון ויציבה — הבסיס לכל תנועה חזקה ובטוחה.',
        meta: ['15 דק׳', 'כל הרמות'],
        icon: <path d="M4 7h16M4 12h10M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    },
    {
        title: 'אימוני משקל גוף',
        desc: 'בלי ציוד, בכל מקום — תוכנית שלמה שמשתמשת רק במשקל הגוף שלכם.',
        meta: ['40 דק׳', 'מתחילים'],
        icon: <path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    }
];

export function Programs() {
    return (
        <section id="programs" className="py-20 sm:py-28">
            <Reveal className="max-w-2xl">
                <span className="badge">תוכניות אימון</span>
                <h2 className="mt-4">אימון לכל מטרה, לכל רמת כושר</h2>
                <p className="mt-4 text-lg text-neutral-300">
                    בוחרים תוכנית, עוקבים אחרי המאמן במסך, ומרגישים את ההבדל כבר באימון הראשון.
                </p>
            </Reveal>

            <div className="grid gap-6 mt-12 sm:grid-cols-2 lg:grid-cols-3">
                {programs.map((program, index) => (
                    <Reveal key={program.title} delay={index * 80}>
                        <div className="h-full p-6 transition-all border group card-surface rounded-3xl border-edge hover:-translate-y-1.5 hover:border-primary/50">
                            <div className="flex items-center justify-center w-12 h-12 transition-colors rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content">
                                <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                                    {program.icon}
                                </svg>
                            </div>
                            <h3 className="mt-5">{program.title}</h3>
                            <p className="mt-2 text-sm text-neutral-300">{program.desc}</p>
                            <div className="flex gap-2 mt-5">
                                {program.meta.map((m) => (
                                    <span key={m} className="px-2.5 py-1 text-xs rounded-full bg-white/5 text-muted">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
