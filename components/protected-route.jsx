'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';

export function ProtectedRoute({ children, requiredRole = null }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (!loading && requiredRole && user.role !== requiredRole) {
            router.push('/dashboard');
        }
    }, [user, loading, requiredRole, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>טוען...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    if (requiredRole && user.role !== requiredRole) {
        return null;
    }

    return children;
}
