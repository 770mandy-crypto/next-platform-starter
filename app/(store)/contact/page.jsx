import { ContactForm } from 'components/store/contact-form';

export const metadata = {
    title: 'צור קשר',
    description: 'ליצירת קשר עם מאיה בוטיק — שאלות, מדידות אישיות, החזרות ושיתופי פעולה.'
};

export default function ContactPage() {
    return (
        <div className="px-6 py-12 mx-auto max-w-5xl">
            <p className="eyebrow">נשמח לשמוע</p>
            <h1 className="mt-3">צור קשר</h1>
            <p className="max-w-2xl mt-4 text-lg leading-relaxed text-mocha">
                שאלה על מידה, בקשה למדידה אישית או סתם התלבטות בין שני צבעים — כתבי לנו ונחזור אלייך תוך יום עסקים אחד.
            </p>

            <div className="grid gap-12 mt-12 lg:grid-cols-[1fr_18rem]">
                <ContactForm />

                <aside className="flex flex-col gap-8 text-sm">
                    <div>
                        <h2 className="text-lg font-display">הבוטיק</h2>
                        <address className="mt-2 not-italic leading-relaxed text-mocha">
                            רחוב שבזי 12, תל אביב־יפו
                            <br />
                            ראשון–חמישי 10:00–19:00
                            <br />
                            שישי 09:00–14:00
                        </address>
                    </div>

                    <div>
                        <h2 className="text-lg font-display">ישירות</h2>
                        <p className="mt-2 leading-relaxed text-mocha">
                            <span dir="ltr" className="block">
                                03-000-0000
                            </span>
                            <span dir="ltr" className="block">
                                hello@maya-boutique.co.il
                            </span>
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-display">משלוחים והחזרות</h2>
                        <p className="mt-2 leading-relaxed text-mocha">
                            משלוח עד הבית תוך 3–5 ימי עסקים, חינם בהזמנה מעל ₪350. אפשר להחזיר או להחליף כל פריט תוך 30
                            יום, על חשבוננו.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
