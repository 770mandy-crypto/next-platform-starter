'use client';

import { useState } from 'react';

const MAX_PHOTOS = 8;
const MAX_SIDE = 1600;

// Shrinks a photo in the browser to at most 1600px on its long side, as JPEG.
// Phone photos are often 4–8 MB; this brings them to a few hundred KB.
async function shrink(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
    if (!bitmap) throw new Error(`לא הצלחנו לקרוא את ${file.name}`);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('הכיווץ נכשל'))), 'image/jpeg', 0.82));
}

export function PhotoUploader({ listingId, token, initialPhotos = [] }) {
    const [photos, setPhotos] = useState(initialPhotos);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);

    async function upload(files) {
        setError(null);
        const room = MAX_PHOTOS - photos.length;
        const list = [...files].slice(0, room);
        if (files.length > room) setError(`אפשר עד ${MAX_PHOTOS} תמונות. העלינו את ${room} הראשונות.`);
        // One at a time: each upload updates the listing's photo list.
        for (const [i, file] of list.entries()) {
            setBusy(`מעלה תמונה ${i + 1} מתוך ${list.length}...`);
            try {
                const blob = await shrink(file);
                const res = await fetch(`/api/matzpen/listings/${listingId}/photos`, {
                    method: 'POST',
                    headers: { 'content-type': 'image/jpeg', 'x-edit-token': token },
                    body: blob
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'ההעלאה נכשלה');
                setPhotos(data.photos);
            } catch (e) {
                setError(e.message);
                break;
            }
        }
        setBusy(null);
    }

    async function remove(photoId) {
        const res = await fetch(`/api/matzpen/listings/${listingId}/photos/${photoId}`, { method: 'DELETE', headers: { 'x-edit-token': token } });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setPhotos(data.photos);
        else setError(data.error || 'המחיקה נכשלה');
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
                {photos.map((p) => (
                    <div key={p} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/matzpen/photos/${listingId}/${p}`} alt="" className="h-full w-full object-cover" />
                        <button
                            type="button"
                            onClick={() => remove(p)}
                            className="absolute left-1 top-1 rounded-full bg-black/60 px-2 text-sm leading-6 text-white"
                            aria-label="מחיקת תמונה"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            {photos.length < MAX_PHOTOS && (
                <label className={`block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-sm font-bold text-slate-600 hover:border-indigo-400 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                    {busy ?? `📷 הוספת תמונות (${photos.length}/${MAX_PHOTOS})`}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            upload(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </label>
            )}
            {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>
    );
}
