import { ProblemForm } from 'components/problem/problem-form';
import { ProtectedRoute } from 'components/protected-route';

export const metadata = {
    title: 'בקשה חדשה — FixNow'
};

export default function ProblemPage() {
    return (
        <ProtectedRoute requiredRole="customer">
            <div dir="rtl" className="flex flex-col gap-8 py-12">
                <header className="flex flex-col gap-3">
                    <h1 className="text-4xl font-bold">🔧 בקשה חדשה</h1>
                    <p className="text-lg opacity-80 max-w-2xl">
                        תאר את הבעיה שלך בטקסט או תמונה. אנחנו נעזור לך למצוא את הטכנאי המתאים!
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                            <ProblemForm />
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="space-y-4">
                            <div className="bg-blue-900/50 border border-blue-500/30 rounded-lg p-6">
                                <h3 className="font-bold mb-3">💡 טיפים לכתיבה טובה</h3>
                                <ul className="text-sm opacity-90 space-y-2">
                                    <li>✓ תאר בדיוק מה קרה</li>
                                    <li>✓ רשום מתי התחילה</li>
                                    <li>✓ אם אפשר, הוסף תמונה</li>
                                    <li>✓ תאר ניסיונות שכבר עשית</li>
                                </ul>
                            </div>

                            <div className="bg-blue-900/50 border border-blue-500/30 rounded-lg p-6">
                                <h3 className="font-bold mb-3">📷 טיפים לתמונה טובה</h3>
                                <ul className="text-sm opacity-90 space-y-2">
                                    <li>✓ תאורה טובה</li>
                                    <li>✓ זווית ברורה</li>
                                    <li>✓ הצג את הבעיה בבירור</li>
                                    <li>✓ JPG או PNG בלבד</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
