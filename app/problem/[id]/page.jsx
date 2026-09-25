'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from 'components/protected-route';
import { AnalysisResult } from 'components/problem/analysis-result';

export default function ProblemDetailsPage({ params }) {
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const response = await fetch(`/api/problems/${params.id}`);
                if (!response.ok) {
                    throw new Error('בעיה לא נמצאה');
                }
                const data = await response.json();
                setProblem(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProblem();
    }, [params.id]);

    if (loading) {
        return (
            <ProtectedRoute requiredRole="customer">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p>טוען תוצאות ניתוח...</p>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    if (error) {
        return (
            <ProtectedRoute requiredRole="customer">
                <div dir="rtl" className="flex flex-col gap-8 py-12">
                    <div className="p-4 bg-red-500/20 border border-red-500/50 rounded text-red-200">
                        {error}
                    </div>
                    <Link href="/problem" className="btn btn-lg">
                        ← חזור ליצירת בקשה חדשה
                    </Link>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute requiredRole="customer">
            <div dir="rtl" className="flex flex-col gap-8 py-12">
                <header className="flex flex-col gap-3">
                    <h1 className="text-4xl font-bold">{problem?.title || 'ניתוח הבעיה שלך'}</h1>
                    <p className="text-lg opacity-80">הנתוצאות של ניתוח AI</p>
                </header>

                {problem?.analysis && (
                    <AnalysisResult
                        analysis={problem.analysis}
                        title={problem.title}
                    />
                )}

                <div className="flex gap-4 flex-wrap">
                    <Link href="/services" className="btn btn-lg">
                        👥 ראה טכנאים זמינים
                    </Link>
                    <Link href="/problem" className="btn btn-lg btn-outline">
                        ✏️ בקשה חדשה
                    </Link>
                </div>
            </div>
        </ProtectedRoute>
    );
}
