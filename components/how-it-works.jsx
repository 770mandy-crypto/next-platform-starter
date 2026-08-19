import { Reveal } from 'components/reveal';

const steps = [
    { num: '01', title: 'בדיקת כושר קצרה', desc: 'שאלון של 2 דקות שממפה רמת כושר, מטרות וזמן פנוי.' },
    { num: '02', title: 'תוכנית מותאמת אישית', desc: 'אלגוריתם ומאמנים אנושיים בונים לכם תוכנית שמתאימה בדיוק אליכם.' },
    { num: '03', title: 'מתאמנים עם ליווי חי', desc: 'וידאו הדרכה, תזמון קולי ותיקוני טכניקה בזמן אמת מהסלון.' },
    { num: '04', title: 'עוקבים אחרי התוצאות', desc: 'גרפים, רצפים ואבני דרך שמראים בדיוק לאן אתם מתקדמים.' }
];

export function HowItWorks() {
    return (
        <section id="how" className="py-20 sm:py-28">
            <Reveal className="max-w-2xl mx-auto text-center">
                <span className="badge">איך זה עובד</span>
                <h2 className="mt-4">מהספה לאימון בעצימות מלאה — ב-4 צעדים</h2>
            </Reveal>

            <div className="relative grid gap-8 mt-16 sm:grid-cols-2 lg:grid-cols-4">
                <div
                    className="absolute hidden h-px lg:block top-6 right-[12%] left-[12%] bg-gradient-to-l from-primary via-secondary to-primary opacity-30"
                    aria-hidden="true"
                />
                {steps.map((step, index) => (
                    <Reveal key={step.num} delay={index * 100} className="relative text-center">
                        <div className="relative z-10 flex items-center justify-center w-12 h-12 mx-auto font-display text-lg border-2 rounded-full bg-neutral-950 border-primary text-primary">
                            {step.num}
                        </div>
                        <h3 className="mt-5">{step.title}</h3>
                        <p className="mt-2 text-sm text-neutral-300">{step.desc}</p>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}
