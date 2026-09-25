'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from 'components/auth-provider';

export function RegisterForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('customer');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('הסיסמאות אינן תואמות');
            return;
        }

        if (password.length < 6) {
            setError('הסיסמה חייבת להיות לפחות 6 תווים');
            return;
        }

        setLoading(true);
        const success = await register(email, password, name, role);
        if (success) {
            router.push('/dashboard');
        } else {
            setError('הרשמה נכשלה. בדוק את הנתונים שלך.');
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-center">הרשם ל-FixNow</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">שם מלא</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="יוחנן דוכס"
                            required
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">דוא"ל</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">אני:</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-primary"
                        >
                            <option value="customer">לקוח (מחפש שירות)</option>
                            <option value="professional">בעל מקצוע (טכנאי)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">סיסמה</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">אישור סיסמה</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-primary"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition"
                    >
                        {loading ? 'מרשם...' : 'הרשם'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-white/70">
                    כבר יש לך חשבון?{' '}
                    <Link href="/login" className="text-blue-400 hover:text-blue-300">
                        התחבר כאן
                    </Link>
                </div>
            </div>
        </div>
    );
}
