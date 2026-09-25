'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from 'components/auth-provider';

export function ProblemForm() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const { user } = useAuth();

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('גודל התמונה חייב להיות עד 5MB');
                return;
            }

            setImage(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setImagePreview(event.target?.result);
            };
            reader.readAsDataURL(file);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim() || !description.trim()) {
            setError('כותרת ותיאור נדרשים');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            if (image) {
                formData.append('image', image);
            }

            const response = await fetch('/api/problems', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || 'שגיאה בשליחת הבקשה');
                return;
            }

            const data = await response.json();
            router.push(`/problem/${data.id}`);
        } catch (err) {
            setError('שגיאה בשליחת הבקשה');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-2">כותרת הבעיה *</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="לדוגמה: ברז דולף בחדר האמבטיה"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">תאור מפורט *</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="תאר בפירוט: מה קרה, מתי זה התחיל, מה כבר נסית..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-blue-500 min-h-[120px]"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">קטגוריה משוערת</label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-blue-500"
                >
                    <option value="">-- בחר קטגוריה --</option>
                    <option value="אינסטלציה">אינסטלציה</option>
                    <option value="חשמל">חשמל</option>
                    <option value="בנייה">בנייה</option>
                    <option value="תיקונים כללים">תיקונים כללים</option>
                    <option value="עץ">עץ</option>
                    <option value="טייח">טייח</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-3">🖼️ הוסף תמונה של הבעיה</label>

                {imagePreview ? (
                    <div className="relative mb-4">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded border border-white/20"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setImage(null);
                                setImagePreview(null);
                            }}
                            className="absolute top-2 left-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                        >
                            ✕ הסר
                        </button>
                    </div>
                ) : (
                    <label className="block border-2 border-dashed border-blue-500/50 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition">
                        <div className="text-3xl mb-2">📸</div>
                        <p className="font-medium">גרור תמונה או לחץ להעלות</p>
                        <p className="text-xs opacity-70 mt-1">PNG, JPG, WebP עד 5MB</p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </label>
                )}
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition"
            >
                {loading ? '⏳ שולח...' : '🚀 שלח בקשה'}
            </button>
        </form>
    );
}
