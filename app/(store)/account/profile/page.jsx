'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/me');
                if (!res.ok) {
                    router.push('/auth/signin');
                    return;
                }
                const data = await res.json();
                setUser(data.user);
                setName(data.user.name || '');
                setEmail(data.user.email || '');
                setPhone(data.user.phone || '');
                setAddress(data.user.address || '');
                setCity(data.user.city || '');
                setPostalCode(data.user.postalCode || '');
                setCountry(data.user.country || '');
            } catch (err) {
                console.error('Auth check failed:', err);
                router.push('/auth/signin');
            } finally {
                setLoading(false);
            }
        }

        fetchUser();
    }, [router]);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, address, city, postalCode, country })
            });

            if (!res.ok) {
                throw new Error('Failed to update profile');
            }

            setSuccess('הפרופיל עודכן בהצלחה');
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    }

    async function handleLogout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/');
        } catch (err) {
            setError('Logout failed');
        }
    }

    if (loading) {
        return (
            <div className="px-6 py-16 mx-auto max-w-2xl sm:px-10 sm:py-24">
                <p className="text-muted">טוען...</p>
            </div>
        );
    }

    return (
        <div className="px-6 py-16 mx-auto max-w-2xl sm:px-10 sm:py-24">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">הפרופיל שלי</h1>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm bg-ink border border-gold text-gold rounded hover:bg-gold hover:text-ink transition-colors"
                >
                    התנתקות
                </button>
            </div>

            <div className="mb-6 flex gap-4">
                <Link href="/account/orders" className="text-gold hover:underline">
                    ההזמנות שלי
                </Link>
                <span className="text-hairline">|</span>
                <span className="text-gold font-semibold">הפרופיל שלי</span>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-900 text-red-100 rounded text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-3 bg-green-900 text-green-100 rounded text-sm">
                    {success}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2">שם מלא</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                            placeholder="שמך"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2">דואר אלקטרוני</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone opacity-50"
                        />
                        <p className="text-xs text-muted mt-1">לא ניתן לשנות</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">טלפון</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                            placeholder="+972-50-000-0000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">כתובת</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                            placeholder="רחוב ומספר בית"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">עיר</label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                            placeholder="עיר"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">מיקוד</label>
                        <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                            placeholder="מיקוד"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2">מדינה</label>
                        <input
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-3 border border-hairline rounded bg-ink-2 text-bone"
                            placeholder="ישראל"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gold text-ink py-3 font-semibold rounded hover:opacity-90 disabled:opacity-50"
                >
                    {saving ? 'שומר...' : 'שמור שינויים'}
                </button>
            </form>

            <div className="mt-8 pt-8 border-t border-hairline text-center">
                <Link href="/shop" className="text-gold hover:underline">
                    חזור לחנות
                </Link>
            </div>
        </div>
    );
}
