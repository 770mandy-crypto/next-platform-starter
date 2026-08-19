import { Reveal } from 'components/reveal';

const faqs = [
    {
        q: 'האם אני צריך ציוד כושר בבית?',
        a: 'לא חובה. רוב התוכניות בנויות סביב משקל גוף, ואפשר לשדרג בהדרגה עם משקולות יד או גומיות התנגדות אם תרצו.'
    },
    {
        q: 'כמה זמן לוקח אימון?',
        a: 'בין 15 ל-45 דקות בהתאם לתוכנית שבחרתם ולזמן הפנוי שלכם באותו יום.'
    },
    {
        q: 'אני בכלל לא בכושר — זה מתאים לי?',
        a: 'בהחלט. שאלון ההתאמה בונה תוכנית לפי הרמה שלכם ומתקדם בהדרגה, כולל תוכניות ייעודיות למתחילים.'
    },
    {
        q: 'אפשר לבטל מנוי בכל שלב?',
        a: 'כן, ללא התחייבות וללא קנס ביטול. אפשר לבטל בלחיצת כפתור מאזור האישי בכל רגע.'
    },
    {
        q: 'האם יש ליווי אנושי אמיתי, לא רק וידאו מוקלט?',
        a: 'כן — לכל מסלול פרו ומעלה יש מאמן אישי שזמין לשאלות ומתאים את התוכנית שלכם לפי התקדמות בפועל.'
    }
];

export function Faq() {
    return (
        <section id="faq" className="py-20 sm:py-28">
            <Reveal className="max-w-2xl mx-auto text-center">
                <span className="badge">שאלות נפוצות</span>
                <h2 className="mt-4">כל מה שרציתם לדעת</h2>
            </Reveal>

            <div className="max-w-2xl mx-auto mt-12 space-y-4">
                {faqs.map((item, index) => (
                    <Reveal key={item.q} delay={index * 60}>
                        <details className="p-6 overflow-hidden border group card-surface rounded-2xl border-edge">
                            <summary className="flex items-center justify-between gap-4 font-semibold text-white list-none cursor-pointer">
                                {item.q}
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5 shrink-0 accordion-icon text-primary"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                </svg>
                            </summary>
                            <div className="accordion-content">
                                <div>
                                    <p className="pt-4 text-sm text-neutral-300">{item.a}</p>
                                </div>
                            </div>
                        </details>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
