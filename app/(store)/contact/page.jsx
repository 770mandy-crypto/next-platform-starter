import { ContactForm } from 'components/store/contact-form';
import { Reveal } from 'components/store/reveal';

export const metadata = {
    title: 'צור קשר',
    description: 'יצירת קשר עם AM CLOTHING — מידות, הזמנות, החזרות ושיתופי פעולה.'
};

export default function ContactPage() {
    return (
        <div className="px-6 py-16 mx-auto max-w-6xl sm:px-10 sm:py-24">
            <Reveal>
                <p className="eyebrow">יצירת קשר</p>
                <h1 className="mt-4">דברו איתנו</h1>
                <p className="max-w-2xl mt-6 text-lg leading-relaxed text-muted">
                    שאלה על מידה, סטטוס הזמנה או בקשה להחלפה — כתבו לנו ונחזור אליכם תוך יום עסקים אחד.
                </p>
            </Reveal>

            <div className="grid gap-16 mt-16 lg:grid-cols-[1fr_18rem]">
                <Reveal delay={120}>
                    <ContactForm />
                </Reveal>

                <Reveal delay={220}>
                    <aside className="flex flex-col gap-10 text-sm">
                        <div>
                            <p className="text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">
                                ישירות
                            </p>
                            <p className="mt-4 leading-loose text-muted">
                                <span dir="ltr" className="block">
                                    hello@amclothing.co.il
                                </span>
                                <span dir="ltr" className="block">
                                    @am.clothing
                                </span>
                            </p>
                        </div>

                        <div>
                            <p className="text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">
                                מידות
                            </p>
                            <p className="mt-4 leading-relaxed text-muted">
                                הגזרות רגילות ונכונות למידה. אם אתם בין שתי מידות ואוהבים גזרה רפויה — קחו את הגדולה.
                                בספק? כתבו לנו גובה ומשקל ונגיד בדיוק.
                            </p>
                        </div>

                        <div>
                            <p className="text-[0.62rem] font-semibold tracking-[0.28em] uppercase text-gold">
                                משלוחים והחזרות
                            </p>
                            <p className="mt-4 leading-relaxed text-muted">
                                משלוח עד הבית תוך 3–5 ימי עסקים, חינם בהזמנה מעל ₪350. החלפה או החזרה עד 30 יום, על
                                חשבוננו.
                            </p>
                        </div>
                    </aside>
                </Reveal>
            </div>
        </div>
    );
}
