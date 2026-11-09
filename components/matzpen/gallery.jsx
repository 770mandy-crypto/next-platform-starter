'use client';

import { useState } from 'react';

export function Gallery({ listingId, photos }) {
    const [index, setIndex] = useState(0);
    if (!photos?.length) return null;
    const src = (p) => `/api/matzpen/photos/${listingId}/${p}`;
    return (
        <div className="space-y-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src(photos[index])} alt={`תמונה ${index + 1} מתוך ${photos.length}`} className="h-full w-full object-cover" />
                {photos.length > 1 && (
                    <>
                        <button onClick={() => setIndex((index - 1 + photos.length) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-xl text-white" aria-label="הקודמת">
                            ›
                        </button>
                        <button onClick={() => setIndex((index + 1) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1 text-xl text-white" aria-label="הבאה">
                            ‹
                        </button>
                        <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 text-xs text-white">
                            {index + 1}/{photos.length}
                        </span>
                    </>
                )}
            </div>
            {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                    {photos.map((p, i) => (
                        <button key={p} onClick={() => setIndex(i)} className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ${i === index ? 'ring-indigo-600' : 'ring-transparent'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src(p)} alt="" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
