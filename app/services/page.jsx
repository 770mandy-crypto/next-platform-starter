'use client';

import Link from 'next/link';
import { ProtectedRoute } from 'components/protected-route';
import { useAuth } from 'components/auth-provider';

const mockProfessionals = [
    {
        id: 'prof_1',
        name: 'דוד אברהם',
        title: 'טכנאי אינסטלציה',
        rating: 4.8,
        reviews: 47,
        location: 'תל אביב',
        experience: '15 שנים',
        estimatedPrice: '180-250',
        image: '👨‍🔧'
    },
    {
        id: 'prof_2',
        name: 'יוסי הנדס',
        title: 'אינסטלציה וחשמל',
        rating: 4.5,
        reviews: 32,
        location: 'תל אביב',
        experience: '8 שנים',
        estimatedPrice: '150-220',
        image: '👨‍🔧'
    },
    {
        id: 'prof_3',
        name: 'שלום אלון',
        title: 'טכנאי בנייה',
        rating: 4.3,
        reviews: 28,
        location: 'גן דוד',
        experience: '12 שנים',
        estimatedPrice: '200-300',
        image: '👨‍🔧'
    },
    {
        id: 'prof_4',
        name: 'מיכאל רוזנברג',
        title: 'חשמלאי מומחה',
        rating: 4.9,
        reviews: 53,
        location: 'תל אביב',
        experience: '20 שנים',
        estimatedPrice: '200-350',
        image: '⚡'
    },
    {
        id: 'prof_5',
        name: 'דינה לפידות',
        title: 'עבודות בטיח',
        rating: 4.7,
        reviews: 35,
        location: 'רמת גן',
        experience: '10 שנים',
        estimatedPrice: '120-200',
        image: '🏗️'
    }
];

export default function ServicesPage() {
    const { user } = useAuth();

    return (
        <ProtectedRoute requiredRole="customer">
            <div dir="rtl" className="flex flex-col gap-8 py-12">
                <header className="flex flex-col gap-3">
                    <h1 className="text-4xl font-bold">👥 בעלי מקצוע זמינים</h1>
                    <p className="text-lg opacity-80 max-w-2xl">
                        הנה רשימת הטכנאים המומלצים בתחום. בחר מישהו שמתאים לך וצור קשר!
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mockProfessionals.map((prof) => (
                        <div
                            key={prof.id}
                            className="p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="text-3xl mb-2">{prof.image}</div>
                                    <h3 className="text-xl font-bold">{prof.name}</h3>
                                    <p className="text-sm opacity-75">{prof.title}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-yellow-400">⭐ {prof.rating}</div>
                                    <p className="text-xs opacity-70">{prof.reviews} ביקורות</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4 text-sm opacity-80">
                                <p>📍 {prof.location}</p>
                                <p>⏱️ {prof.experience} ניסיון</p>
                                <p>💰 {prof.estimatedPrice} ש״ח</p>
                            </div>

                            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition">
                                בקש הצעה
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-blue-900/50 border border-blue-500/30 rounded-lg">
                    <h3 className="font-bold mb-2">💡 טיפ</h3>
                    <p className="opacity-80 text-sm">
                        רוצה לראות עוד אפשרויות? צור בקשה חדשה וציין את דרישותיך במדויק!
                    </p>
                    <Link href="/problem" className="inline-block mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
                        צור בקשה חדשה
                    </Link>
                </div>
            </div>
        </ProtectedRoute>
    );
}
