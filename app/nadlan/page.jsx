import { WaitlistForm } from 'components/nadlan/waitlist-form';

const pains = [
    { icon: '📱', text: 'מאות הודעות בוואטסאפ, ולידים שנבלעים בין הקבוצות' },
    { icon: '🗂️', text: 'נכסים מפוזרים בין פתקים, אקסלים ותמונות בגלריה' },
    { icon: '⏰', text: 'שוכחים לחזור ללקוח, והוא סוגר עם מתווך אחר' }
];

const features = [
    {
        icon: '🤖',
        title: 'קולט לידים אוטומטית',
        text: 'מעבירים הודעה מוואטסאפ, וה-AI מזהה מה הלקוח מחפש: אזור, תקציב, חדרים ותאריך כניסה.'
    },
    {
        icon: '🎯',
        title: 'התאמה חכמה קונה–נכס',
        text: 'כל נכס חדש מקבל רשימת לקוחות מתאימים, וכל לקוח חדש מקבל רשימת נכסים. בלי לחפש ידנית.'
    },
    {
        icon: '🔔',
        title: 'תזכורות מעקב',
        text: 'יודעים בדיוק למי לחזור היום ומה להגיד לו. אף ליד לא נופל בין הכיסאות.'
    },
    {
        icon: '✍️',
        title: 'מנסח הודעות בשבילך',
        text: 'הודעת היכרות, שליחת נכס או תזכורת לסיור, מנוסחות בסגנון שלך ומוכנות לשליחה.'
    }
];

const steps = [
    { title: 'מחברים את הוואטסאפ', text: 'או פשוט מעבירים הודעות ללידים ולנכסים למספר של סוגרים.' },
    { title: 'ה-AI עושה סדר', text: 'כל ליד וכל נכס נשמרים בכרטיס מסודר עם כל הפרטים החשובים.' },
    { title: 'אתם סוגרים עסקאות', text: 'מקבלים כל בוקר רשימה קצרה: למי לחזור, איזה נכס להציע, ומה לכתוב.' }
];

const faq = [
    {
        q: 'צריך להבין במחשבים?',
        a: 'לא. אם אתם יודעים להעביר הודעה בוואטסאפ, אתם יודעים להשתמש בסוגרים.'
    },
    {
        q: 'המידע של הלקוחות שלי מאובטח?',
        a: 'כן. המידע שלכם נשאר שלכם, מוצפן ולא משותף עם מתווכים אחרים.'
    },
    {
        q: 'כמה זה יעלה?',
        a: 'אנחנו עדיין קובעים מחיר. מי שמצטרף לרשימת ההמתנה יקבל תקופת ניסיון חינם ומחיר מייסדים.'
    },
    {
        q: 'מתי זה יוצא?',
        a: 'אנחנו פותחים גישה מוקדמת לקבוצה קטנה של מתווכים בקרוב. הירשמו כדי להיות בפנים.'
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

function ChatDemo() {
    return (
        <div className="mx-auto w-full max-w-sm rounded-[2rem] bg-slate-900 p-3 shadow-2xl">
            <div className="space-y-3 rounded-[1.5rem] bg-[#e5ddd5] p-4 text-sm">
                <div className="mr-auto max-w-[85%] rounded-xl rounded-tl-none bg-white p-3 shadow-sm">
                    היי, מחפשים 4 חדרים ברמת גן, עד 3.2 מיליון, כניסה בקיץ 🙏
                    <div className="mt-1 text-left text-[10px] text-slate-400">ליד חדש · 09:14</div>
                </div>
                <div className="ml-auto max-w-[90%] rounded-xl rounded-tr-none bg-[#dcf8c6] p-3 shadow-sm">
                    <div className="mb-1 font-bold text-indigo-700">🔑 סוגרים</div>
                    <div>נשמר ליד חדש:</div>
                    <div>📍 רמת גן · 4 חד׳ · עד ₪3.2M · קיץ</div>
                    <div className="mt-2 font-bold">נמצאו 3 נכסים מתאימים 🎯</div>
                    <div className="mt-1">רוצה שאשלח לו אותם עם הודעה מוכנה?</div>
                    <div className="mt-1 text-left text-[10px] text-slate-500">09:14 ✓✓</div>
                </div>
            </div>
        </div>
    );
}

export default function NadlanHome() {
    return (
        <main>
            {/* Hero */}
            <section className="bg-gradient-to-b from-indigo-50 to-white px-5 pb-16 pt-14">
                <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
                    <div className="text-center md:text-right">
                        <span className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-700">
                            עוזר AI למתווכי נדל״ן
                        </span>
                        <h1 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">
                            פחות בלגן בוואטסאפ,
                            <br />
                            <span className="text-indigo-600">יותר עסקאות סגורות</span>
                        </h1>
                        <p className="mb-8 text-lg text-slate-600">
                            סוגרים מסדר לך את הלידים והנכסים, מתאים קונים לדירות ומזכיר מתי לחזור לכל לקוח. אוטומטית.
                        </p>
                        <div className="flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                            <a
                                href="#waitlist"
                                className="rounded-full bg-indigo-600 px-8 py-4 text-lg font-bold text-white no-underline shadow-lg hover:bg-indigo-700"
                            >
                                קבלו גישה מוקדמת
                            </a>
                            <a href="#how" className="font-semibold text-slate-700 no-underline">
                                איך זה עובד ←
                            </a>
                        </div>
                    </div>
                    <ChatDemo />
                </div>
            </section>

            {/* Pain */}
            <Section title="מכירים את זה?">
                <div className="mt-8 grid gap-5 md:grid-cols-3">
                    {pains.map((p) => (
                        <div key={p.text} className="rounded-2xl bg-rose-50 p-6 text-center">
                            <div className="mb-3 text-4xl">{p.icon}</div>
                            <p className="font-semibold text-slate-700">{p.text}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-8 text-center text-lg font-bold text-slate-800">
                    כל ליד שנשכח הוא עמלה שהלכה למישהו אחר. סוגרים דואג שזה לא יקרה.
                </p>
            </Section>

            {/* Features */}
            <Section title="מה סוגרים עושה בשבילך" subtitle="כל מה שמתווך עסוק צריך, בלי ללמוד מערכת חדשה." className="bg-slate-50">
                <div className="grid gap-5 sm:grid-cols-2">
                    {features.map((f) => (
                        <div key={f.title} className="rounded-2xl bg-white p-6 shadow-sm">
                            <div className="mb-3 text-4xl">{f.icon}</div>
                            <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                            <p className="text-slate-600">{f.text}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* How it works */}
            <Section id="how" title="איך זה עובד">
                <ol className="mt-10 grid gap-6 md:grid-cols-3">
                    {steps.map((step, i) => (
                        <li key={step.title} className="rounded-2xl border border-slate-200 p-6">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-black text-white">
                                {i + 1}
                            </div>
                            <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                            <p className="text-slate-600">{step.text}</p>
                        </li>
                    ))}
                </ol>
            </Section>

            {/* FAQ */}
            <Section title="שאלות נפוצות" className="bg-slate-50">
                <div className="mx-auto mt-8 max-w-2xl space-y-3">
                    {faq.map((item) => (
                        <details key={item.q} className="group rounded-xl bg-white p-5 shadow-sm">
                            <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                                {item.q}
                                <span className="text-indigo-600 transition group-open:rotate-45">+</span>
                            </summary>
                            <p className="mt-3 text-slate-600">{item.a}</p>
                        </details>
                    ))}
                </div>
            </Section>

            {/* Waitlist */}
            <section id="waitlist" className="scroll-mt-20 px-5 py-16">
                <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-center text-white">
                    <h2 className="mb-3 text-3xl font-extrabold">רוצים להיות מהראשונים?</h2>
                    <p className="mb-8 text-indigo-100">
                        הצטרפו לרשימת ההמתנה וקבלו תקופת ניסיון חינם ומחיר מייסדים.
                    </p>
                    <WaitlistForm />
                </div>
            </section>
        </main>
    );
}
