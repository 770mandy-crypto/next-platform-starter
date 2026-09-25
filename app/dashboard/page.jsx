'use client';

import Link from 'next/link';
import { ProtectedRoute } from 'components/protected-route';
import { useAuth } from 'components/auth-provider';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <ProtectedRoute>
            <div dir="rtl" className="flex flex-col gap-8 py-12">
                <header className="flex flex-col gap-3">
                    <h1 className="text-4xl font-bold">
                        {user?.role === 'professional' ? '👨‍🔧 לוח בקרה של בעל מקצוע' : '👤 לוח בקרה שלי'}
                    </h1>
                    <p className="text-lg opacity-80">
                        {user?.role === 'professional'
                            ? 'ניהול הצעות וקביעת פגישות עם לקוחות'
                            : 'ניהול בקשותיך ומעקב אחר הטכנאים'}
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {user?.role === 'customer' ? (
                        <>
                            <Link
                                href="/problem"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">🔧</div>
                                <h3 className="text-xl font-bold mb-2">בקשה חדשה</h3>
                                <p className="opacity-70">תאר את הבעיה שלך וקבל ממלצות לטכנאים</p>
                            </Link>

                            <Link
                                href="/my-requests"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">📋</div>
                                <h3 className="text-xl font-bold mb-2">בקשותיי</h3>
                                <p className="opacity-70">צפה בבקשותיך הפעילות</p>
                            </Link>

                            <Link
                                href="/reviews"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">⭐</div>
                                <h3 className="text-xl font-bold mb-2">ביקורות</h3>
                                <p className="opacity-70">בדוק ביקורות על טכנאים</p>
                            </Link>

                            <Link
                                href="/help"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">❓</div>
                                <h3 className="text-xl font-bold mb-2">מדריך</h3>
                                <p className="opacity-70">למד מה לבדוק לפני שמזמין שירות</p>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/my-profile"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">👤</div>
                                <h3 className="text-xl font-bold mb-2">פרופיל שלי</h3>
                                <p className="opacity-70">ערוך את הפרטים המקצועיים שלך</p>
                            </Link>

                            <Link
                                href="/my-quotes"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">💰</div>
                                <h3 className="text-xl font-bold mb-2">הצעות שלי</h3>
                                <p className="opacity-70">ניהול הצעות מחיר</p>
                            </Link>

                            <Link
                                href="/available-jobs"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">🎯</div>
                                <h3 className="text-xl font-bold mb-2">בקשות זמינות</h3>
                                <p className="opacity-70">בקשות חדשות מלקוחות בתחומך</p>
                            </Link>

                            <Link
                                href="/ratings"
                                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                            >
                                <div className="text-3xl mb-3">⭐</div>
                                <h3 className="text-xl font-bold mb-2">דירוגים שלי</h3>
                                <p className="opacity-70">צפה בדירוגים וביקורות של לקוחות</p>
                            </Link>
                        </>
                    )}
                </div>

                <div className="mt-8 p-6 bg-blue-900/50 border border-blue-500/30 rounded-lg">
                    <h3 className="text-lg font-bold mb-2">💡 טיפ</h3>
                    <p className="opacity-80">
                        {user?.role === 'customer'
                            ? 'כשאתה משדרג בקשה חדשה, אפשר להוסיף תמונה של הבעיה כדי שהטכנאים יוכלו להבין טוב יותר.'
                            : 'השק את הפרופיל שלך עם תמונה והצע שירותים ספציפיים כדי למשוך יותר לקוחות.'}
                    </p>
                </div>
            </div>
        </ProtectedRoute>
    );
}
