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
                    <h1 className="mb-4 text-4xl font-bold">ברוכים הבאים, {user.name}! 👋</h1>
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
        <>
            {/* Hero Section */}
            <div dir="rtl" className="flex flex-col gap-16 py-16 sm:py-24">
                <section className="text-center space-y-6">
                    <div>
                        <h1 className="text-6xl sm:text-7xl font-bold mb-4">FixNow</h1>
                        <p className="text-2xl sm:text-3xl opacity-90 mb-4">
                            חיבור קל וחכם בין לקוחות לבעלי מקצוע
                        </p>
                    </div>

                    <p className="text-xl opacity-80 max-w-2xl mx-auto leading-relaxed">
                        צריך טכנאי, מדביר או בעל מקצוע?
                        <br />
                        תאר את הבעיה שלך וקבל המלצות מיידיות!
                    </p>

                    <div className="flex gap-4 flex-wrap justify-center pt-4">
                        <Link href="/register" className="btn btn-lg bg-blue-600 hover:bg-blue-700">
                            🚀 התחל עכשיו
                        </Link>
                        <Link href="/login" className="btn btn-lg bg-white/10 hover:bg-white/20 border border-white/20">
                            📱 התחבר
                        </Link>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="space-y-8">
                    <h2 className="text-4xl font-bold text-center">למה FixNow?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 rounded-lg hover:border-blue-500/60 transition">
                            <div className="text-5xl mb-4">⚡</div>
                            <h3 className="text-2xl font-bold mb-3">מהיר וקל</h3>
                            <p className="opacity-80 text-lg">
                                מ-תיאור בעיה להצעה בדקות ספורות. ללא סיבוכים.
                            </p>
                        </div>

                        <div className="p-8 bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30 rounded-lg hover:border-green-500/60 transition">
                            <div className="text-5xl mb-4">🎯</div>
                            <h3 className="text-2xl font-bold mb-3">מומחים בתחום</h3>
                            <p className="opacity-80 text-lg">
                                AI חכם מחבר אותך לטכנאים המתאימים ביותר.
                            </p>
                        </div>

                        <div className="p-8 bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 rounded-lg hover:border-purple-500/60 transition">
                            <div className="text-5xl mb-4">🛡️</div>
                            <h3 className="text-2xl font-bold mb-3">בטוח ואמין</h3>
                            <p className="opacity-80 text-lg">
                                ביקורות אמיתיות ודירוגים שקופים. בטוח 100%.
                            </p>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="space-y-8">
                    <h2 className="text-4xl font-bold text-center">איך זה עובד?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center space-y-4">
                            <div className="text-6xl">📝</div>
                            <h3 className="text-xl font-bold">1. תאר את הבעיה</h3>
                            <p className="opacity-70 text-sm">
                                כתוב או צלם תמונה של הבעיה שלך
                            </p>
                        </div>

                        <div className="text-center space-y-4">
                            <div className="text-6xl">🤖</div>
                            <h3 className="text-xl font-bold">2. AI מנתח</h3>
                            <p className="opacity-70 text-sm">
                                הבעיה מנותחת אוטומטית לתחום המתאים
                            </p>
                        </div>

                        <div className="text-center space-y-4">
                            <div className="text-6xl">👥</div>
                            <h3 className="text-xl font-bold">3. חיבור לטכנאים</h3>
                            <p className="opacity-70 text-sm">
                                קבל הצעות מטכנאים בעלי דירוג גבוה
                            </p>
                        </div>

                        <div className="text-center space-y-4">
                            <div className="text-6xl">✅</div>
                            <h3 className="text-xl font-bold">4. בוצע!</h3>
                            <p className="opacity-70 text-sm">
                                בחר טכנאי וספרי ביקורת אחרי העבודה
                            </p>
                        </div>
                    </div>
                </section>

                {/* For Different Users */}
                <section className="space-y-8">
                    <h2 className="text-4xl font-bold text-center">לכל אחד יש משהו</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-10 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition">
                            <h3 className="text-3xl font-bold mb-4">👤 לקוחות</h3>
                            <ul className="space-y-3 opacity-85 text-lg">
                                <li>✓ תאור חכם של בעיה</li>
                                <li>✓ המלצות AI ממוקדות</li>
                                <li>✓ השוואת מחירים וביקורות</li>
                                <li>✓ רשימת בדיקה לפני קריאה</li>
                            </ul>
                        </div>

                        <div className="p-10 bg-white/5 border border-white/10 rounded-lg hover:bg-white/8 transition">
                            <h3 className="text-3xl font-bold mb-4">🔧 בעלי מקצוע</h3>
                            <ul className="space-y-3 opacity-85 text-lg">
                                <li>✓ בקשות של לקוחות בעלי קשר</li>
                                <li>✓ קידום הפרופיל שלך</li>
                                <li>✓ ניהול הצעות וזמנים</li>
                                <li>✓ בנייה דירוג ייחודי</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="text-center space-y-8 py-16 px-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border border-white/10 rounded-2xl">
                    <h2 className="text-4xl font-bold">מוכן להתחיל?</h2>
                    <p className="text-xl opacity-80 max-w-2xl mx-auto">
                        הצטרף לאלפים שכבר משתמשים בFixNow למצוא טכנאים נאמנים
                    </p>
                    <div className="flex gap-4 flex-wrap justify-center">
                        <Link href="/register" className="btn btn-lg bg-blue-600 hover:bg-blue-700">
                            🚀 הרשם בחינם
                        </Link>
                        <Link href="/login" className="btn btn-lg bg-white/10 hover:bg-white/20 border border-white/20">
                            כבר יש לי חשבון
                        </Link>
                    </div>
                </section>

                {/* Footer Info */}
                <section className="text-center text-sm opacity-70 space-y-2 pt-8">
                    <p>✨ FixNow - החיבור הקל והחכם בעבודה</p>
                    <p>🔒 כל הנתונים מוגנים ומוצפנים</p>
                </section>
            </div>
        </>
    );
}
