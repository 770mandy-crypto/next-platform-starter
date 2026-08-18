import Link from 'next/link';

export const metadata = {
    title: 'אודות',
    description: 'הסיפור של מאיה בוטיק — סדרות קטנות, בדים טבעיים ותפירה בישראל.'
};

const values = [
    {
        title: 'סדרות קטנות',
        text: 'כל דגם נתפר בעשרות יחידות בלבד. זה אומר פחות עודפים, פחות בזבוז, ופריט שלא תפגשי על כל אישה שנייה ברחוב.'
    },
    {
        title: 'בדים שנושמים',
        text: 'פשתן אירופאי, כותנה אורגנית מאושרת GOTS, משי וצמר. בדים טבעיים מתיישנים יפה — הם נעשים רכים יותר, לא גרועים יותר.'
    },
    {
        title: 'תפירה מקומית',
        text: 'אנחנו עובדות עם סדנת תפירה קטנה בדרום תל אביב, שאנחנו מכירות בשם את כל מי שעובד בה.'
    },
    {
        title: 'מחיר הוגן',
        text: 'בלי מתווכים ובלי חנויות רשת. המחיר משקף את הבד, את התפירה ואת העבודה — ולא שרשרת שיווק שלמה.'
    }
];

export default function AboutPage() {
    return (
        <div className="px-6 py-12 mx-auto max-w-4xl">
            <p className="eyebrow">הסיפור שלנו</p>
            <h1 className="mt-3">התחיל מחולצת פשתן אחת</h1>

            <div className="flex flex-col gap-5 mt-8 text-lg leading-relaxed text-mocha">
                <p>
                    מאיה בוטיק נולד מתוך תסכול פשוט: רצינו בגדים שנעים ללבוש, שמחזיקים יותר מעונה אחת, ושלא דורשים
                    התפשרות בין נוחות לבין להרגיש טוב עם עצמך. לא מצאנו — אז תפרנו.
                </p>
                <p>
                    הפריט הראשון היה חולצת פשתן בגזרת בוקס, שתפרנו בעשרים יחידות בשביל חברות. תוך שבועיים הן נגמרו,
                    והחברות שאלו מתי הסדרה הבאה. מאז עברנו לסדנה גדולה יותר, אבל השיטה נשארה: דגם אחד, סדרה קטנה,
                    ואם הוא לא מספיק טוב — הוא לא יוצא לחנות.
                </p>
                <p>
                    היום הקולקציה כוללת שמלות, סריגים, חולצות, חצאיות ומעילים. את כולם אפשר ללבוש יחד, כי הפלטה נבנתה
                    כך שכל פריט מדבר עם כל פריט אחר בארון.
                </p>
            </div>

            <div className="grid gap-8 mt-16 sm:grid-cols-2">
                {values.map((value) => (
                    <div key={value.title}>
                        <h2 className="text-xl font-display">{value.title}</h2>
                        <p className="mt-2 leading-relaxed text-mocha">{value.text}</p>
                    </div>
                ))}
            </div>

            <div className="p-8 mt-16 text-center rounded-2xl bg-sand/70">
                <h2 className="text-2xl">רוצה לראות את הבגדים מקרוב?</h2>
                <p className="mt-3 text-mocha">
                    הבוטיק ברחוב שבזי 12 בתל אביב פתוח ראשון–חמישי, ואפשר לקבוע מדידה אישית מראש.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                    <Link href="/contact" className="btn-clay">
                        לקביעת מדידה
                    </Link>
                    <Link href="/shop" className="btn-ghost">
                        לקולקציה
                    </Link>
                </div>
            </div>
        </div>
    );
}
