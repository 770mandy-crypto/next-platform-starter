import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

const FEATURES = [
    ['⏰', 'תזכורות שמגיעות אליך', '"תזכיר לי ביום חמישי ב-8 לשלם ארנונה". העוזר שולח לך הודעה בזמן, גם בעוד שבוע. אפשר גם כל יום, כל שבוע או כל חודש.'],
    ['🛒', 'רשימות שנשמרות', '"תוסיף חלב, ביצים ולחם לקניות". בסופר שואלים "מה ברשימה?" ומוחקים כל מה שכבר קנית.'],
    ['📷', 'קורא תמונות ומסמכים', 'שולחים צילום של חשבון, מכתב או הזמנה, והעוזר מסביר מה חשוב בו ומציע תזכורת למועד התשלום.'],
    ['🎤', 'מבין הודעות קוליות', 'אין צורך להקליד. מקליטים בעברית, והעוזר מבין ומבצע.'],
    ['🔎', 'מחפש ברשת', 'שעות פתיחה, מחירים, ומה צריך להביא למשרד הפנים: מידע עדכני, לא מה שהיה נכון לפני שנה.']
];

const SETTINGS = [
    ['WHATSAPP_TOKEN', 'טוקן קבוע של System User ב-Meta Business', true],
    ['WHATSAPP_PHONE_NUMBER_ID', 'המזהה של מספר הוואטסאפ העסקי (Phone number ID, לא המספר עצמו)', true],
    ['WHATSAPP_VERIFY_TOKEN', 'מחרוזת שאתם בוחרים. מקלידים אותה שוב בהגדרת ה-Webhook ב-Meta', true],
    ['WHATSAPP_APP_SECRET', 'App Secret של האפליקציה ב-Meta, לאימות שההודעות באמת מגיעות מוואטסאפ', true],
    ['ANTHROPIC_API_KEY', 'המפתח של Claude, המוח של העוזר', true],
    ['ELEVENLABS_API_KEY', 'לא חובה: מאפשר הבנה של הודעות קוליות', false],
    ['WHATSAPP_REMINDER_TEMPLATE', 'לא חובה: תבנית מאושרת עם משתנה אחד, לתזכורות אחרי 24 שעות בלי הודעה מהמשתמש', false],
    ['WHATSAPP_ALLOWED_NUMBERS', 'לא חובה: רק המספרים האלה יכולים להשתמש בעוזר, מופרדים בפסיקים (972501234567)', false],
    ['WHATSAPP_DAILY_LIMIT', 'לא חובה: מספר ההודעות המרבי לאדם ביום (ברירת המחדל: 60)', false]
];

export default async function WhatsAppPage() {
    const h = await headers();
    const origin = (process.env.URL || `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`).replace(/\/$/, '');
    const webhookUrl = `${origin}/api/whatsapp/webhook`;
    const required = SETTINGS.filter(([, , req]) => req);
    const ready = required.every(([name]) => Boolean(process.env[name]));

    return (
        <main className="mx-auto max-w-4xl px-5 py-10">
            <section className="mb-12 text-center">
                <h1 className="mb-4 text-4xl font-black leading-tight sm:text-5xl">העוזר האישי שלך, בתוך הוואטסאפ</h1>
                <p className="mx-auto max-w-2xl text-lg text-slate-600">
                    צ׳אט רגיל עונה רק כשפונים אליו. העוזר הזה זוכר את הרשימות שלך, ופונה אליך בעצמו כשמגיע הזמן של תזכורת.
                </p>
                <div
                    className={`mt-6 inline-block rounded-full px-4 py-1.5 text-sm font-bold ${
                        ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                >
                    {ready ? '✅ העוזר מחובר ופעיל' : '⚙️ חסרות הגדרות, ראו בהמשך העמוד'}
                </div>
            </section>

            <section className="mb-14 grid gap-4 sm:grid-cols-2">
                {FEATURES.map(([icon, title, text]) => (
                    <div key={title} className="rounded-2xl border border-slate-200 p-5">
                        <div className="mb-2 text-3xl">{icon}</div>
                        <h2 className="mb-1 text-lg font-bold">{title}</h2>
                        <p className="text-slate-600">{text}</p>
                    </div>
                ))}
            </section>

            <section className="mb-14">
                <h2 className="mb-4 text-2xl font-black">דוגמה לשיחה</h2>
                <div className="mx-auto max-w-md space-y-2 rounded-2xl bg-[#e5ddd5] p-4 text-[15px]">
                    <Bubble me>תזכיר לי מחר בבוקר להתקשר לגן, ותוסיף לקניות חיתולים ומטרנה</Bubble>
                    <Bubble>
                        ✅ תזכורת: מחר (יום ראשון 15.11) בשעה 09:00, להתקשר לגן.
                        <br />
                        🛒 הוספתי לקניות: חיתולים, מטרנה.
                    </Bubble>
                    <Bubble me>📷 [צילום של חשבון חשמל]</Bubble>
                    <Bubble>
                        חשבון חשמל: <b>412.30 ₪</b>, לתשלום עד 28.11.
                        <br />
                        לקבוע תזכורת ליום לפני?
                    </Bubble>
                    <Bubble me>כן</Bubble>
                    <Bubble>⏰ קבעתי: 27.11 בשעה 09:00, לשלם חשבון חשמל.</Bubble>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="mb-2 text-2xl font-black">חיבור לוואטסאפ</h2>
                <ol className="mb-6 list-decimal space-y-2 pr-5 text-slate-700">
                    <li>
                        ב-<span dir="ltr">developers.facebook.com</span> יוצרים אפליקציה מסוג Business ומוסיפים לה את המוצר WhatsApp.
                    </li>
                    <li>מוסיפים מספר טלפון עסקי (מספר שלא מחובר לוואטסאפ רגיל), ויוצרים System User עם טוקן קבוע.</li>
                    <li>מגדירים ב-Netlify את משתני הסביבה שבטבלה.</li>
                    <li>
                        בהגדרות ה-Webhook של WhatsApp מדביקים את הכתובת הזאת ואת ה-Verify token, ונרשמים לשדה <code>messages</code>:
                        <div dir="ltr" className="mt-2 break-all rounded-lg bg-white p-3 font-mono text-sm">
                            {webhookUrl}
                        </div>
                    </li>
                    <li>
                        כדי שתזכורת תגיע גם אחרי יותר מ-24 שעות שבהן המשתמש לא כתב, וואטסאפ דורשת תבנית מאושרת. יוצרים תבנית מסוג Utility
                        בעברית, למשל: <q>⏰ תזכורת: {'{{1}}'}</q>, ושמים את השם שלה ב-<code>WHATSAPP_REMINDER_TEMPLATE</code>.
                    </li>
                </ol>

                <ul className="text-sm">
                    {SETTINGS.map(([name, text, req]) => {
                        const set = Boolean(process.env[name]);
                        return (
                            <li key={name} className="flex gap-3 border-t border-slate-200 py-3">
                                <span className="text-lg">{set ? '✅' : req ? '❌' : '➖'}</span>
                                <div className="min-w-0">
                                    <code dir="ltr" className="block break-all font-mono text-xs font-bold sm:text-sm">
                                        {name}
                                    </code>
                                    <span className="text-slate-600">{text}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </main>
    );
}

function Bubble({ me = false, children }) {
    return (
        <div className={`flex ${me ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${me ? 'bg-[#dcf8c6]' : 'bg-white'}`}>{children}</div>
        </div>
    );
}
