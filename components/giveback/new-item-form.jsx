'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CITIES, CONDITIONS } from 'lib/giveback/catalog';
import { nearestCity } from 'lib/giveback/geo';
import { api } from './api';
import { getGpsFix } from './location';
import { useSession } from './session';

const MAX_PHOTOS = 4;
const MAX_EDGE = 1280;

// Phone photos are several MB each; the function body limit is 6MB total.
// Downscaling in the browser keeps four photos comfortably inside it.
async function downscale(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', 0.8);
}

export function NewItemForm() {
    const router = useRouter();
    const { requireUser } = useSession();
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: '',
        condition: 'good',
        city: '',
        neighborhood: '',
        address: ''
    });
    const [photos, setPhotos] = useState([]);
    const [gps, setGps] = useState(null);
    const [locating, setLocating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    async function addPhotos(event) {
        const files = [...event.target.files].slice(0, MAX_PHOTOS - photos.length);
        event.target.value = '';
        try {
            const scaled = await Promise.all(files.map(downscale));
            setPhotos((p) => [...p, ...scaled].slice(0, MAX_PHOTOS));
        } catch {
            setError('לא הצלחנו לקרוא את התמונה');
        }
    }

    async function useGps() {
        setLocating(true);
        setError('');
        try {
            const fix = await getGpsFix();
            setGps(fix);
            const city = nearestCity(fix);
            if (city) setForm((f) => ({ ...f, city: f.city || city.name }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLocating(false);
        }
    }

    async function submit(event) {
        event.preventDefault();
        setError('');
        try {
            await requireUser();
        } catch {
            return;
        }
        setBusy(true);
        try {
            const { item } = await api('/items', { method: 'POST', body: { ...form, gps, photos } });
            router.push(`/giveback/item/${item.id}?new=1`);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    const ready = form.title.trim().length >= 2 && form.category && form.city;

    return (
        <form onSubmit={submit} className="flex flex-col max-w-2xl gap-6">
            <Field label="מה מוסרים?" hint="כותרת קצרה, כמו שמישהו היה מחפש: ״שידה 3 מגירות״">
                <input className="input" value={form.title} onChange={set('title')} maxLength={80} required />
            </Field>

            <Field label="קטגוריה">
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                        <label
                            key={c.id}
                            className={`px-3 py-1.5 text-sm rounded-full border cursor-pointer transition ${
                                form.category === c.id
                                    ? 'bg-primary text-primary-content border-primary font-bold'
                                    : 'border-white/20 hover:bg-white/10'
                            }`}
                        >
                            <input
                                type="radio"
                                name="category"
                                value={c.id}
                                className="sr-only"
                                onChange={set('category')}
                            />
                            {c.emoji} {c.label}
                        </label>
                    ))}
                </div>
            </Field>

            <Field label="תמונות" hint="עד 4. פריט עם תמונה נמסר הרבה יותר מהר.">
                <div className="flex flex-wrap gap-3">
                    {photos.map((src, i) => (
                        <div key={i} className="relative w-24 h-24 overflow-hidden rounded-lg">
                            <img src={src} alt="" className="object-cover w-full h-full" />
                            <button
                                type="button"
                                className="absolute w-6 h-6 text-xs rounded-full top-1 end-1 bg-black/70 cursor-pointer"
                                onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                                aria-label="הסרת תמונה"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                        <label className="flex flex-col items-center justify-center w-24 h-24 text-sm border-2 border-dashed rounded-lg cursor-pointer border-white/30 hover:bg-white/10">
                            <span className="text-2xl">📷</span>
                            הוספה
                            <input type="file" accept="image/*" multiple className="sr-only" onChange={addPhotos} />
                        </label>
                    )}
                </div>
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
                <Field label="מצב">
                    <select className="input" value={form.condition} onChange={set('condition')}>
                        {CONDITIONS.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <Field label="תיאור" hint="מידות, צבע, פגמים, האם צריך לפרק / יש מדרגות…">
                <textarea
                    className="input min-h-28"
                    value={form.description}
                    onChange={set('description')}
                    maxLength={1000}
                />
            </Field>

            <fieldset className="flex flex-col gap-4 p-4 border rounded-xl border-white/15">
                <legend className="px-2 font-bold">איפה אוספים?</legend>
                <button type="button" className="btn self-start" onClick={useGps} disabled={locating}>
                    {locating ? 'מאתר…' : gps ? '✅ המיקום נקלט' : '📍 הפריט נמצא כאן — השתמש במיקום שלי'}
                </button>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="עיר">
                        <select className="input" value={form.city} onChange={set('city')} required>
                            <option value="">בחירה…</option>
                            {CITIES.map((c) => (
                                <option key={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="שכונה (לא חובה)">
                        <input
                            className="input"
                            value={form.neighborhood}
                            onChange={set('neighborhood')}
                            maxLength={40}
                        />
                    </Field>
                </div>
                <Field
                    label="כתובת מלאה (פרטית)"
                    hint="🔒 לא מוצגת לאף אחד. תישלח רק כשתלחצו ״שלח כתובת״ בצ׳אט — יחד עם קישור ניווט ב-Waze."
                >
                    <input
                        className="input"
                        value={form.address}
                        onChange={set('address')}
                        placeholder="רחוב ומספר בית"
                        maxLength={120}
                    />
                </Field>
                <p className="text-xs opacity-70">בחיפוש מוצג רק האזור (ברדיוס של כקילומטר) והמרחק — לא הבית שלכם.</p>
            </fieldset>

            {error && <p className="text-red-300">{error}</p>}
            <button className="btn btn-lg" disabled={!ready || busy}>
                {busy ? 'מפרסם…' : '🎁 פרסום למסירה'}
            </button>
        </form>
    );
}

function Field({ label, hint, children }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="font-bold">{label}</span>
            {children}
            {hint && <span className="text-xs opacity-70">{hint}</span>}
        </div>
    );
}
