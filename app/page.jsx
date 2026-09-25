'use client';

import Link from 'next/link';
import { useAuth } from 'components/auth-provider';

export default function Page() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    if (user) {
        return (
            <div dir="rtl" className="flex flex-col gap-12 py-12">
                <section>
                    <h1 className="mb-4 text-4xl font-bold">ברוכים הבאים, {user.name}!</h1>
                    <p className="mb-6 text-lg opacity-80">
                        אנחנו שמחים שאתה חלק מ-FixNow. בואו נתחיל!
                    </p>
                    <Link href="/dashboard" className="btn btn-lg">
                        לך לדשבורד
                    </Link>
                </section>
            </div>
        );
    }

    return (
        <div dir="rtl" className="flex flex-col gap-12 sm:gap-16 py-12">
            <section>
                <h1 className="mb-4 text-4xl font-bold">FixNow</h1>
                <p className="mb-6 text-lg opacity-80">
                    חיבור קל וחכם בין בעלי מקצוע ללקוחות שצריכים שירות
                </p>
                <p className="mb-6 text-lg opacity-70">
                    בין אם אתה לקוח שצריך טכנאי, מדביר או בעל מקצוע אחר,
                    או בעל מקצוע המחפש לקוחות חדשים — FixNow הוא המקום המושלם לך.
                </p>
                <div className="flex gap-4 flex-wrap">
                    <Link href="/register" className="btn btn-lg">
                        הרשם עכשיו
                    </Link>
                    <Link href="/login" className="btn btn-lg btn-outline">
                        התחבר
                    </Link>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                    <div className="text-4xl mb-3">👤</div>
                    <h3 className="text-xl font-bold mb-2">עבור לקוחות</h3>
                    <p className="opacity-70">
                        תאר את הבעיה שלך בטקסט או תמונה. אנחנו נחבר אותך לבעלי מקצוע ממומלצים, ותוכל להשוות הצעות ולקרוא ביקורות.
                    </p>
                </div>

                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                    <div className="text-4xl mb-3">🔧</div>
                    <h3 className="text-xl font-bold mb-2">עבור בעלי מקצוע</h3>
                    <p className="opacity-70">
                        הרשם כטכנאי ובנה את הפרופיל המקצועי שלך. קבל בקשות מלקוחות בעלי קשר וגדל את העסק שלך.
                    </p>
                </div>

                <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                    <div className="text-4xl mb-3">🤝</div>
                    <h3 className="text-xl font-bold mb-2">בטוח ותומך</h3>
                    <p className="opacity-70">
                        בדיקות זהות, ביקורות אמיתיות, ומערכת דירוג שקופה. כולם מרוצים.
                    </p>
                </div>
            </section>

            <section className="p-8 bg-blue-900/50 border border-blue-500/30 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">איך זה עובד?</h2>
                <ol className="space-y-3 opacity-80">
                    <li>
                        <span className="font-bold">1. הרשם:</span> בחר האם אתה לקוח או בעל מקצוע
                    </li>
                    <li>
                        <span className="font-bold">2. תאר/חפש:</span> תאר את הבעיה או חפש בקשות
                    </li>
                    <li>
                        <span className="font-bold">3. השוו/הציע:</span> קבל הצעות או הצע מחיר
                    </li>
                    <li>
                        <span className="font-bold">4. ודאו את העבודה:</span> שמור ביקורות אמיתיות
                    </li>
                </ol>
            </section>
        </div>
    );
}
