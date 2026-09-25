'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        setError(null);
        setLoading(true);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || 'התחברות נכשלה');
                return false;
            }

            const userData = await response.json();
            setUser(userData);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const register = async (email, password, name, role) => {
        setError(null);
        setLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name, role })
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || 'הרשמה נכשלה');
                return false;
            }

            const userData = await response.json();
            setUser(userData);
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
