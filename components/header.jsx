'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import netlifyLogo from 'public/netlify-logo.svg';
import githubLogo from 'public/images/github-mark-white.svg';
import { useAuth } from './auth-provider';

const navItems = [
    { linkText: 'דף הבית', href: '/' },
    { linkText: '📋 לוח בקרה', href: '/dashboard' },
    { linkText: '🔧 שירותים', href: '/services' },
];

export function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <nav className="flex flex-wrap items-center gap-4 pt-6 pb-12 sm:pt-12 md:pb-24">
            <Link href="/">
                <h1 className="text-2xl font-bold">FixNow</h1>
            </Link>
            {user && !!navItems?.length && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {navItems.map((item, index) => (
                        <li key={index}>
                            <Link href={item.href} className="inline-flex px-1.5 py-1 sm:px-3 sm:py-2">
                                {item.linkText}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <div className="ml-auto flex items-center gap-4">
                {user ? (
                    <>
                        <span className="text-sm opacity-70">{user.name}</span>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded text-sm transition"
                        >
                            התנתק
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded text-sm transition">
                            התחברות
                        </Link>
                        <Link href="/register" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition">
                            הרשמה
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
